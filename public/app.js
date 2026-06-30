const PROXY_API_BASE = "/ifapi";
const SESSION_REFRESH_MS = 10 * 60 * 1000;
const FLIGHT_REFRESH_MS = 15 * 1000;
const IDLE_STOP_MS = 15 * 60 * 1000;
const EXPERT_NAME = "Expert Server";

const elements = {
  matchCount: document.querySelector("#matchCount"),
  totalCount: document.querySelector("#totalCount"),
  updatedAt: document.querySelector("#updatedAt"),
  selectedPanel: document.querySelector("#selectedPanel"),
  selectedRule: document.querySelector("#selectedRule"),
  selectedCallsign: document.querySelector("#selectedCallsign"),
  closePanelButton: document.querySelector("#closePanelButton"),
  pilotName: document.querySelector("#pilotName"),
  pilotOrg: document.querySelector("#pilotOrg"),
  originCode: document.querySelector("#originCode"),
  destinationCode: document.querySelector("#destinationCode"),
  altitudeValue: document.querySelector("#altitudeValue"),
  speedValue: document.querySelector("#speedValue"),
  headingValue: document.querySelector("#headingValue"),
  flightPlanValue: document.querySelector("#flightPlanValue"),
  aircraftValue: document.querySelector("#aircraftValue"),
  liveryValue: document.querySelector("#liveryValue"),
  toast: document.querySelector("#toast"),
};

const state = {
  running: false,
  paused: false,
  expertSessionId: null,
  sessionLastLoaded: 0,
  selectedFlightId: null,
  hasFitBounds: false,
  markers: new Map(),
  selectedRouteLayer: null,
  selectedRouteSignature: "",
  flights: [],
  aircraftById: new Map(),
  liveryById: new Map(),
  liveriesByAircraftId: new Map(),
  requestedAircraftLiveries: new Set(),
  flightPlansByFlightId: new Map(),
  requestedFlightPlans: new Set(),
  referenceDataLoaded: false,
  refreshTimer: null,
  idleTimer: null,
};

const map = L.map("map", {
  worldCopyJump: true,
  zoomControl: false,
  preferCanvas: true,
}).setView([31.2, 105.9], 4);

L.control.zoom({ position: "bottomright" }).addTo(map);
state.selectedRouteLayer = L.layerGroup().addTo(map);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
  maxZoom: 19,
  subdomains: "abcd",
  updateWhenIdle: true,
  keepBuffer: 3,
  tileSize: 256,
  zoomOffset: 0,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
}).addTo(map);

requestAnimationFrame(() => {
  map.invalidateSize();
  window.setTimeout(() => map.invalidateSize(), 250);
});

window.addEventListener("load", () => map.invalidateSize());
window.addEventListener("resize", () => map.invalidateSize());
window.addEventListener("load", () => startTracking());

elements.closePanelButton.addEventListener("click", closeSelectedFlight);

document.addEventListener("pointerdown", resetIdleTimer, { passive: true });
document.addEventListener("keydown", resetIdleTimer);

function closeSelectedFlight() {
  state.selectedFlightId = null;
  clearSelectedRoute();
  renderSelectedFlight(null);
}

async function startTracking() {
  state.running = true;
  state.paused = false;
  state.sessionLastLoaded = 0;
  state.hasFitBounds = false;

  resetIdleTimer();

  try {
    await loadReferenceData();
    await refreshFlights();
  } catch (error) {
    stopTracking(error.message || "Unable to connect to Infinite Flight.");
  }
}

function stopTracking(message) {
  state.running = false;
  state.paused = false;
  state.selectedFlightId = null;
  window.clearTimeout(state.refreshTimer);
  window.clearTimeout(state.idleTimer);
  clearSelectedRoute();
  renderSelectedFlight(null);
  if (message) showToast(message);
}

async function refreshFlights() {
  if (!state.running || state.paused) return;

  const now = Date.now();
  if (!state.expertSessionId || now - state.sessionLastLoaded > SESSION_REFRESH_MS) {
    await loadExpertSession();
  }

  const payload = await request(`/sessions/${state.expertSessionId}/flights`);
  const flights = Array.isArray(payload.result) ? payload.result : [];
  const matchingFlights = flights
    .map((flight) => ({ ...flight, matchReason: getMatchReason(flight) }))
    .filter((flight) => flight.matchReason)
    .sort(sortFlights);

  state.flights = matchingFlights;
  elements.totalCount.textContent = String(flights.length);
  elements.matchCount.textContent = String(matchingFlights.length);
  elements.updatedAt.textContent = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  renderMarkers(matchingFlights);
  syncSelectedFlight();
  if (!state.selectedFlightId && matchingFlights.length && !state.hasFitBounds) {
    fitToFlights();
    state.hasFitBounds = true;
  }
  scheduleFlightRefresh(FLIGHT_REFRESH_MS);
}

async function loadExpertSession() {
  const payload = await request("/sessions");
  const sessions = Array.isArray(payload.result) ? payload.result : [];
  const expert = sessions.find((session) => {
    const name = String(session.name || "").toLowerCase();
    return name.includes("expert") || session.id === "expert";
  });

  if (!expert) {
    throw new Error("The Expert Server session was not found in the Live API response.");
  }

  state.expertSessionId = expert.id;
  state.sessionLastLoaded = Date.now();
  showToast(`Connected to ${expert.name || EXPERT_NAME}.`);
}

async function request(path) {
  const response = await fetch(`${PROXY_API_BASE}${path}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Run this app with `node server.mjs`; VS Code Live Server does not provide /ifapi.");
    }
    if (response.status === 503) {
      throw new Error("Add INFINITE_FLIGHT_API_KEY to .env, then restart the server.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Infinite Flight rejected the API key in .env.");
    }
    throw new Error(`Infinite Flight API returned ${response.status}.`);
  }

  const payload = await response.json();
  if (payload.errorCode || payload.errorMessage) {
    throw new Error(payload.errorMessage || `Infinite Flight API error ${payload.errorCode}.`);
  }
  return payload;
}

async function loadReferenceData() {
  if (state.referenceDataLoaded) return;
  state.referenceDataLoaded = true;

  const [aircraftPayload, liveriesPayload] = await Promise.allSettled([
    request("/aircraft"),
    request("/aircraft/liveries"),
  ]);

  if (aircraftPayload.status === "fulfilled") {
    normalizeResultArray(aircraftPayload.value).forEach((aircraft) => {
      const id = firstText(aircraft.id, aircraft.aircraftId);
      if (id) state.aircraftById.set(id, aircraft);
    });
  }

  if (liveriesPayload.status === "fulfilled") {
    normalizeResultArray(liveriesPayload.value).forEach((livery) => {
      const id = firstText(livery.id, livery.liveryId);
      const aircraftId = firstText(livery.aircraftId);
      if (id) state.liveryById.set(id, livery);
      if (aircraftId) {
        const list = state.liveriesByAircraftId.get(aircraftId) || [];
        list.push(livery);
        state.liveriesByAircraftId.set(aircraftId, list);
      }
    });
  }
}

function scheduleFlightRefresh(delay) {
  window.clearTimeout(state.refreshTimer);
  state.refreshTimer = window.setTimeout(() => {
    refreshFlights().catch((error) => {
      showToast(error.message || "Live update failed.");
      scheduleFlightRefresh(FLIGHT_REFRESH_MS);
    });
  }, delay);
}

function resetIdleTimer() {
  if (!state.running) return;
  window.clearTimeout(state.idleTimer);
  state.idleTimer = window.setTimeout(() => {
    stopTracking("Stopped after 15 minutes without interaction.");
  }, IDLE_STOP_MS);
}

function getMatchReason(flight) {
  const org = normalizeText(flight.virtualOrganization || flight.virtualOrganizationTag || flight.organization || "");
  const callsign = normalizeCallsign(flight.callsign || "");

  if (org.includes("CZVG") || /\[CZVG\]/.test(org)) {
    return "CZVG";
  }

  if (/^(CSN|CHINASOUTHERN)\d+[A-Z0-9]*VG(HEAVY|SUPER)?$/.test(callsign)) {
    return "China Southern VG";
  }

  if (/^[A-Z]{2,4}\d+[A-Z0-9]*CZ(HEAVY|SUPER)?$/.test(callsign)) {
    return "Airline CZ";
  }

  return "";
}

function normalizeText(value) {
  return String(value).toUpperCase().replace(/\s+/g, "");
}

function normalizeCallsign(value) {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function sortFlights(a, b) {
  return String(a.callsign || "").localeCompare(String(b.callsign || ""));
}

function renderMarkers(flights) {
  const activeIds = new Set();

  flights.forEach((flight) => {
    const id = String(flight.flightId || flight.id || flight.callsign);
    const lat = Number(flight.latitude);
    const lng = Number(flight.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    activeIds.add(id);
    const stored = state.markers.get(id);
    const icon = makePlaneIcon(flight);

    if (stored) {
      stored.marker.setLatLng([lat, lng]);
      stored.marker.setIcon(icon);
    } else {
      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.on("click", () => selectFlight(id, { pan: false }));
      state.markers.set(id, { marker });
    }
  });

  state.markers.forEach((stored, id) => {
    if (!activeIds.has(id)) {
      map.removeLayer(stored.marker);
      state.markers.delete(id);
    }
  });
}

function makePlaneIcon(flight) {
  const element = makePlaneMarkerElement(flight);
  const heading = normalizeHeading(flight.heading);
  element.style.setProperty("--heading", `${heading}deg`);
  return L.divIcon({
    className: "",
    html: element.outerHTML,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function makePlaneMarkerElement(flight) {
  const element = document.createElement("div");
  element.setAttribute("aria-label", "Select flight");
  element.innerHTML = `
    <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <path d="M22 3.8c1.5 0 2.7 1.2 2.7 2.7v10.8l13.1 7.8v4.1l-13.1-4.1v7.7l4.3 3v3.3l-7-1.9-7 1.9v-3.3l4.3-3v-7.7L6.2 29.2v-4.1l13.1-7.8V6.5c0-1.5 1.2-2.7 2.7-2.7Z" />
    </svg>
  `;
  updateMarkerElement(element, flight.matchReason);
  return element;
}

function updateMarkerElement(element, reason) {
  element.className = "plane-marker";
  if (reason === "China Southern VG") {
    element.classList.add("reason-vg");
  } else if (reason === "Airline CZ") {
    element.classList.add("reason-cz");
  }
}

function normalizeHeading(value) {
  const heading = Number(value);
  if (!Number.isFinite(heading)) return 0;
  return ((heading % 360) + 360) % 360;
}

function focusFlight(id) {
  selectFlight(id, { pan: true });
}

function selectFlight(id, options = {}) {
  const flightId = String(id);
  const flight = state.flights.find((item) => String(item.flightId || item.id || item.callsign) === flightId);
  const stored = state.markers.get(String(id));
  if (!flight) return;

  state.selectedFlightId = flightId;
  renderSelectedFlight(flight, { fitRoute: true });
  hydrateAircraftForFlight(flight);

  if (stored) {
    if (options.pan) {
      map.setView(stored.marker.getLatLng(), Math.max(map.getZoom(), 7), { animate: true });
    }
  }
}

function syncSelectedFlight() {
  if (!state.selectedFlightId) return;
  const flight = state.flights.find((item) => String(item.flightId || item.id || item.callsign) === String(state.selectedFlightId));
  if (flight) {
    renderSelectedFlight(flight);
    hydrateAircraftForFlight(flight);
  } else {
    state.selectedFlightId = null;
    clearSelectedRoute();
    renderSelectedFlight(null);
  }
}

function renderSelectedFlight(flight, options = {}) {
  if (!flight) {
    elements.selectedPanel.hidden = true;
    return;
  }

  const details = getFlightDetails(flight);
  hydrateFlightPlanForFlight(flight);
  renderSelectedRoute(flight, { fit: Boolean(options.fitRoute) });
  elements.selectedPanel.hidden = false;
  elements.selectedRule.textContent = flight.matchReason;
  elements.selectedCallsign.textContent = details.callsign;
  elements.pilotName.textContent = details.username;
  elements.pilotOrg.textContent = details.organization;
  elements.originCode.textContent = details.origin;
  elements.destinationCode.textContent = details.destination;
  elements.altitudeValue.textContent = formatNumber(flight.altitude, " ft");
  elements.speedValue.textContent = formatNumber(flight.speed, " kts");
  elements.headingValue.textContent = formatNumber(flight.heading, "°");
  elements.flightPlanValue.textContent = details.flightPlan;
  elements.aircraftValue.textContent = details.aircraft;
  elements.liveryValue.textContent = details.livery;
}

function clearSelectedRoute() {
  if (!state.selectedRouteLayer) return;
  state.selectedRouteLayer.clearLayers();
  state.selectedRouteSignature = "";
}

function renderSelectedRoute(flight, options = {}) {
  if (!state.selectedRouteLayer) return;
  state.selectedRouteLayer.clearLayers();

  const flightPlan = state.flightPlansByFlightId.get(getFlightId(flight)) || flight.flightPlan || {};
  const waypoints = getDrawableWaypoints(flightPlan);
  if (!waypoints.length) {
    state.selectedRouteSignature = "";
    return;
  }

  const routePoints = waypoints.map((waypoint) => [waypoint.lat, waypoint.lng]);
  const currentPoint = getFlightLatLng(flight);
  const linePoints = currentPoint ? [currentPoint, ...routePoints] : routePoints;

  if (linePoints.length > 1) {
    L.polyline(linePoints, {
      className: "selected-route-line",
      color: "#0ea5e9",
      dashArray: currentPoint ? "5 8" : null,
      interactive: false,
      opacity: 0.88,
      weight: 3,
    }).addTo(state.selectedRouteLayer);
  }

  const signature = routePoints.map((point) => point.join(",")).join("|");
  if (options.fit || signature !== state.selectedRouteSignature) {
    const fitPoints = currentPoint ? [currentPoint, ...routePoints] : routePoints;
    fitSelectedRoute(fitPoints);
  }
  state.selectedRouteSignature = signature;
}

function fitSelectedRoute(points) {
  if (!points.length) return;
  if (points.length === 1) {
    map.setView(points[0], Math.max(map.getZoom(), 7), { animate: true });
    return;
  }

  map.fitBounds(L.latLngBounds(points), {
    animate: true,
    maxZoom: 9,
    paddingBottomRight: [80, 80],
    paddingTopLeft: [440, 90],
  });
}

function getDrawableWaypoints(flightPlan) {
  return getFlightPlanItems(flightPlan)
    .map((item, index) => {
      const point = getLatLngFromItem(item);
      if (!point) return null;
      return {
        ...point,
        label: firstText(item.identifier, item.name, item.code, item.type, `WP${index + 1}`),
      };
    })
    .filter(Boolean);
}

function getFlightPlanItems(flightPlan) {
  const candidates = [
    flightPlan.flightPlanItems,
    flightPlan.waypoints,
    flightPlan.points,
  ];

  return candidates.flatMap((candidate) => (Array.isArray(candidate) ? candidate : []));
}

function getFlightLatLng(flight) {
  const lat = Number(flight.latitude);
  const lng = Number(flight.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function getLatLngFromItem(item) {
  if (Array.isArray(item)) {
    const lat = firstNumber(item[0], item[1]?.latitude, item[1]?.lat);
    const lng = firstNumber(item[1], item[1]?.longitude, item[1]?.lon, item[1]?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }
  if (!item || typeof item !== "object") return null;
  const lat = firstNumber(
    item.latitude,
    item.lat,
    item.location?.latitude,
    item.location?.lat,
    item.coordinate?.latitude,
    item.coordinate?.lat,
    item.coordinates?.latitude,
    item.coordinates?.lat,
    item.position?.latitude,
    item.position?.lat,
  );
  const lng = firstNumber(
    item.longitude,
    item.lon,
    item.lng,
    item.location?.longitude,
    item.location?.lon,
    item.location?.lng,
    item.coordinate?.longitude,
    item.coordinate?.lon,
    item.coordinate?.lng,
    item.coordinates?.longitude,
    item.coordinates?.lon,
    item.coordinates?.lng,
    item.position?.longitude,
    item.position?.lon,
    item.position?.lng,
  );
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function fitToFlights() {
  const points = [...state.markers.values()].map((stored) => stored.marker.getLatLng());
  if (!points.length) return;

  if (points.length === 1) {
    map.setView(points[0], Math.max(map.getZoom(), 5), { animate: true });
    return;
  }

  map.fitBounds(L.latLngBounds(points), { padding: [80, 80], maxZoom: 8, animate: true });
}

function formatNumber(value, suffix) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${Math.round(number).toLocaleString()}${suffix}`;
}

function firstNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || String(value).trim() === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return NaN;
}

function formatCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number.toFixed(4);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3800);
}

function getFlightDetails(flight) {
  const flightId = getFlightId(flight);
  const flightPlan = state.flightPlansByFlightId.get(flightId) || flight.flightPlan || {};
  const aircraft = getAircraftInfo(flight);
  const origin = firstText(
    flightPlan.originAirport,
    flightPlan.originAirportIdentifier,
    flightPlan.originInfo?.icao,
    flightPlan.originInfo?.identifier,
    flightPlan.originInfo?.name,
    flightPlan.departureAirport,
    flightPlan.departureAirportIdentifier,
    flight.originAirport,
    flight.departureAirport,
    flight.departure,
    getRouteEndpoint(flightPlan, "first"),
  );
  const destination = firstText(
    flightPlan.destinationAirport,
    flightPlan.destinationAirportIdentifier,
    flightPlan.destinationInfo?.icao,
    flightPlan.destinationInfo?.identifier,
    flightPlan.destinationInfo?.name,
    flightPlan.arrivalAirport,
    flightPlan.arrivalAirportIdentifier,
    flight.destinationAirport,
    flight.arrivalAirport,
    flight.destination,
    getRouteEndpoint(flightPlan, "last"),
  );
  const route = firstText(
    flightPlan.route,
    flightPlan.waypoints,
    getFlightPlanItemRoute(flightPlan),
    flightPlan.flightPlan,
    flight.route,
  );

  return {
    callsign: firstText(flight.callsign, "Unknown Flight"),
    username: firstText(flight.username, flight.userName, flight.pilotName, flight.displayName, "Unknown Pilot"),
    organization: firstText(flight.virtualOrganization, flight.virtualOrganizationTag, flight.organization, "Organization unavailable"),
    origin: formatAirport(origin),
    destination: formatAirport(destination),
    flightPlan: formatFlightPlan(route),
    aircraft: aircraft.name,
    livery: aircraft.livery,
  };
}

function getFlightId(flight) {
  return String(flight.flightId || flight.id || flight.callsign || "");
}

async function hydrateFlightPlanForFlight(flight) {
  const flightId = getFlightId(flight);
  if (!flightId || !state.expertSessionId || state.flightPlansByFlightId.has(flightId) || state.requestedFlightPlans.has(flightId)) {
    return;
  }

  state.requestedFlightPlans.add(flightId);

  try {
    const payload = await request(`/sessions/${state.expertSessionId}/flights/${flightId}/flightplan`);
    const flightPlan = payload.result && typeof payload.result === "object" ? payload.result : {};
    state.flightPlansByFlightId.set(flightId, flightPlan);

    if (String(state.selectedFlightId) === flightId) {
      const selected = state.flights.find((item) => getFlightId(item) === flightId);
      if (selected) renderSelectedFlight(selected);
    }
  } catch (error) {
    state.flightPlansByFlightId.set(flightId, {});
  }
}

function getRouteEndpoint(flightPlan, position) {
  const waypoints = normalizeRouteValues(flightPlan.waypoints);
  if (waypoints.length) return position === "first" ? waypoints[0] : waypoints[waypoints.length - 1];

  const items = Array.isArray(flightPlan.flightPlanItems) ? flightPlan.flightPlanItems : [];
  const identifiers = items.map((item) => firstText(item.identifier, item.name)).filter(Boolean);
  if (!identifiers.length) return "";
  return position === "first" ? identifiers[0] : identifiers[identifiers.length - 1];
}

function getFlightPlanItemRoute(flightPlan) {
  const waypoints = normalizeRouteValues(flightPlan.waypoints);
  if (waypoints.length) return waypoints.join(" ");

  const items = Array.isArray(flightPlan.flightPlanItems) ? flightPlan.flightPlanItems : [];
  return items.map((item) => firstText(item.identifier, item.name)).filter(Boolean).join(" ");
}

function normalizeRouteValues(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return firstText(item.identifier, item.name, item.code, item.type);
        }
        return firstText(item);
      })
      .filter(Boolean);
  }
  return firstText(value).split(/\s+/).filter(Boolean);
}

function getAircraftInfo(flight) {
  const aircraftId = firstText(flight.aircraftId);
  const liveryId = firstText(flight.liveryId);
  const aircraft = state.aircraftById.get(aircraftId);
  const livery = state.liveryById.get(liveryId)
    || (state.liveriesByAircraftId.get(aircraftId) || []).find((item) => firstText(item.id, item.liveryId) === liveryId);

  const aircraftName = firstText(
    flight.aircraft,
    flight.aircraftName,
    aircraft?.name,
    aircraft?.aircraftName,
    aircraft?.displayName,
    aircraft?.shortName,
    aircraft?.icao,
  );
  const liveryName = firstText(
    flight.livery,
    flight.liveryName,
    livery?.name,
    livery?.liveryName,
    livery?.displayName,
    livery?.airlineName,
  );

  return {
    name: aircraftName || (aircraftId ? `Unknown aircraft (${aircraftId.slice(0, 8)})` : "Unknown Aircraft"),
    livery: liveryName || (liveryId ? `Unknown livery (${liveryId.slice(0, 8)})` : "Livery unavailable"),
  };
}

async function hydrateAircraftForFlight(flight) {
  const aircraftId = firstText(flight.aircraftId);
  if (!aircraftId || state.requestedAircraftLiveries.has(aircraftId)) return;

  state.requestedAircraftLiveries.add(aircraftId);

  try {
    const payload = await request(`/aircraft/${aircraftId}/liveries`);
    normalizeResultArray(payload).forEach((livery) => {
      const id = firstText(livery.id, livery.liveryId);
      if (id) state.liveryById.set(id, { ...livery, aircraftId });
    });

    const selected = state.flights.find((item) => String(item.flightId || item.id || item.callsign) === String(state.selectedFlightId));
    if (selected) renderSelectedFlight(selected);
  } catch {
    // Some API keys/versions do not expose aircraft-specific livery lookup.
  }
}

function normalizeResultArray(payload) {
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.result?.data)) return payload.result.data;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function firstText(...values) {
  const value = values.find((item) => {
    if (Array.isArray(item)) return item.length > 0;
    if (typeof item === "object" && item !== null) return false;
    return item !== undefined && item !== null && String(item).trim() !== "";
  });
  if (Array.isArray(value)) return value.join(" ");
  return value === undefined || value === null ? "" : String(value).trim();
}

function formatAirport(value) {
  const text = firstText(value);
  if (!text) return "----";
  return text.toUpperCase();
}

function formatFlightPlan(value) {
  const text = firstText(value);
  if (!text) return "No flight plan available.";
  return text.replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}
