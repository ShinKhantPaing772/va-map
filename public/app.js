const PROXY_API_BASE = "/ifapi";
const SESSION_REFRESH_MS = 10 * 60 * 1000;
const FLIGHT_REFRESH_MS = 15 * 1000;
const IDLE_STOP_MS = 5 * 60 * 1000;
const EXPERT_NAME = "Expert Server";
const EARTH_RADIUS_NM = 3440.065;

const elements = {
  mapShell: document.querySelector(".map-shell"),
  matchCount: document.querySelector("#matchCount"),
  totalCount: document.querySelector("#totalCount"),
  updatedAt: document.querySelector("#updatedAt"),
  zoomInButton: document.querySelector("#zoomInButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  resetMapButton: document.querySelector("#resetMapButton"),
  connectionStatus: document.querySelector("#connectionStatus"),
  connectionLabel: document.querySelector("#connectionLabel"),
  inactivityOverlay: document.querySelector("#inactivityOverlay"),
  resumeTrackingButton: document.querySelector("#resumeTrackingButton"),
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
  routeProgressBar: document.querySelector("#routeProgressBar"),
  routeEstimateStatus: document.querySelector("#routeEstimateStatus"),
  plannedDistanceValue: document.querySelector("#plannedDistanceValue"),
  travelledDistanceValue: document.querySelector("#travelledDistanceValue"),
  remainingDistanceValue: document.querySelector("#remainingDistanceValue"),
  routeProgressValue: document.querySelector("#routeProgressValue"),
  remainingTimeValue: document.querySelector("#remainingTimeValue"),
  etaValue: document.querySelector("#etaValue"),
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
  selectedRouteLayer: null,
  hasFitBounds: false,
  markers: new Map(),
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

const selectedRoutePane = map.createPane("selectedRoute");
selectedRoutePane.style.zIndex = "450";
selectedRoutePane.style.pointerEvents = "none";

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
elements.resumeTrackingButton.addEventListener("click", resumeTracking);
elements.zoomInButton.addEventListener("click", () => map.zoomIn());
elements.zoomOutButton.addEventListener("click", () => map.zoomOut());
elements.resetMapButton.addEventListener("click", fitToFlights);

document.addEventListener("pointerdown", resetIdleTimer, { passive: true });
document.addEventListener("keydown", resetIdleTimer);

function closeSelectedFlight() {
  state.selectedFlightId = null;
  renderSelectedFlight(null);
  renderMarkers(state.flights);
}

async function startTracking() {
  state.running = true;
  state.paused = false;
  state.sessionLastLoaded = 0;
  state.hasFitBounds = false;
  setInactivityOverlay(false);
  setConnectionState("Connecting", "connecting", true);

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
  setInactivityOverlay(false);
  setConnectionState("Offline", "offline", false);
  renderSelectedFlight(null);
  if (message) showToast(message);
}

function pauseTrackingForInactivity() {
  if (!state.running || state.paused) return;
  state.paused = true;
  window.clearTimeout(state.refreshTimer);
  window.clearTimeout(state.idleTimer);
  setConnectionState("Paused", "paused", false);
  setInactivityOverlay(true);
}

function resumeTracking() {
  if (!state.running || !state.paused) return;
  state.paused = false;
  setConnectionState("Connecting", "connecting", true);
  setInactivityOverlay(false);
  resetIdleTimer();
  refreshFlights().catch((error) => {
    stopTracking(error.message || "Unable to resume live updates.");
  });
}

function setInactivityOverlay(visible) {
  elements.inactivityOverlay.hidden = !visible;
  if (visible) {
    window.setTimeout(() => elements.resumeTrackingButton.focus(), 0);
  }
}

async function refreshFlights() {
  if (!state.running || state.paused) return;

  const now = Date.now();
  if (!state.expertSessionId || now - state.sessionLastLoaded > SESSION_REFRESH_MS) {
    await loadExpertSession();
    if (!state.running || state.paused) return;
  }

  const { payload, fetchedAt, cacheStatus } = await request(`/sessions/${state.expertSessionId}/flights`, { includeMeta: true });
  if (!state.running || state.paused) return;

  const flights = Array.isArray(payload.result) ? payload.result : [];
  const matchingFlights = flights
    .map((flight) => ({ ...flight, matchReason: getMatchReason(flight) }))
    .filter((flight) => flight.matchReason)
    .sort(sortFlights);

  state.flights = matchingFlights;
  elements.totalCount.textContent = String(flights.length);
  elements.matchCount.textContent = String(matchingFlights.length);
  elements.updatedAt.textContent = formatUpdatedAt(fetchedAt);
  elements.updatedAt.title = cacheStatus ? `Proxy cache: ${cacheStatus}` : "";
  setConnectionState("Live", "live", false);

  renderMarkers(matchingFlights);
  syncSelectedFlight();
  if (!state.selectedFlightId && matchingFlights.length && !state.hasFitBounds) {
    fitToFlights();
    state.hasFitBounds = true;
  }
  scheduleFlightRefresh(FLIGHT_REFRESH_MS);
}

function setConnectionState(label, stateName, busy) {
  elements.connectionLabel.textContent = label;
  elements.connectionStatus.dataset.state = stateName;
  elements.mapShell.setAttribute("aria-busy", String(busy));
  document.body.classList.toggle("is-loading", busy);
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

async function request(path, options = {}) {
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
  if (options.includeMeta) {
    return {
      payload,
      fetchedAt: response.headers.get("X-Proxy-Fetched-At") || response.headers.get("Date"),
      cacheStatus: response.headers.get("X-Proxy-Cache") || "",
    };
  }
  return payload;
}

function formatUpdatedAt(value) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(safeDate);
  return `${time} Z`;
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
  if (!state.running || state.paused) return;
  window.clearTimeout(state.idleTimer);
  state.idleTimer = window.setTimeout(pauseTrackingForInactivity, IDLE_STOP_MS);
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
    const icon = makePlaneIcon(flight, id === String(state.selectedFlightId));
    const tooltip = makeFlightTooltip(flight);

    if (stored) {
      stored.marker.setLatLng([lat, lng]);
      stored.marker.setIcon(icon);
      stored.marker.setTooltipContent(tooltip);
    } else {
      const marker = L.marker([lat, lng], {
        icon,
        title: `Select ${firstText(flight.callsign, "flight")}`,
        alt: `Aircraft ${firstText(flight.callsign, "flight")}`,
      }).addTo(map);
      marker.on("click", () => selectFlight(id, { pan: false }));
      marker.bindTooltip(tooltip, {
        direction: "top",
        offset: [0, -18],
        opacity: 1,
        className: "flight-tooltip",
      });
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

function makePlaneIcon(flight, selected = false) {
  const element = makePlaneMarkerElement(flight);
  const heading = normalizeHeading(flight.heading);
  element.style.setProperty("--heading", `${heading}deg`);
  if (selected) element.classList.add("is-selected");
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
  const icon = document.createElement("span");
  icon.className = "material-symbols-rounded";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "flight";
  element.append(icon);
  updateMarkerElement(element, flight.matchReason);
  return element;
}

function makeFlightTooltip(flight) {
  const details = getFlightDetails(flight);
  const tooltip = document.createElement("div");
  tooltip.className = "flight-tooltip-content";

  const header = document.createElement("div");
  const callsign = document.createElement("strong");
  callsign.textContent = details.callsign;
  const aircraft = document.createElement("span");
  aircraft.textContent = details.aircraft;
  header.append(callsign, aircraft);

  const metrics = document.createElement("div");
  metrics.className = "flight-tooltip-metrics";
  const route = document.createElement("span");
  route.textContent = `${details.origin} → ${details.destination}`;
  const flightLevel = document.createElement("span");
  flightLevel.textContent = formatFlightLevel(flight.altitude);
  const speed = document.createElement("span");
  speed.textContent = formatNumber(flight.speed, " kt");
  metrics.append(route, flightLevel, speed);
  tooltip.append(header, metrics);
  return tooltip;
}

function formatFlightLevel(value) {
  const altitude = Number(value);
  if (!Number.isFinite(altitude)) return "FL---";
  return `FL${String(Math.max(0, Math.round(altitude / 100))).padStart(3, "0")}`;
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
  renderSelectedFlight(flight);
  renderMarkers(state.flights);
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
    renderSelectedFlight(null);
  }
}

function renderSelectedFlight(flight) {
  if (!flight) {
    elements.selectedPanel.hidden = true;
    clearSelectedRoute();
    return;
  }

  const details = getFlightDetails(flight);
  hydrateFlightPlanForFlight(flight);
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
  renderRouteMetrics(flight);
  renderSelectedRoute(flight);
  elements.flightPlanValue.textContent = details.flightPlan;
  elements.aircraftValue.textContent = details.aircraft;
  elements.liveryValue.textContent = details.livery;
}

function renderSelectedRoute(flight) {
  clearSelectedRoute();
  const flightPlan = state.flightPlansByFlightId.get(getFlightId(flight));
  if (!flightPlan) return;

  const routePoints = getFlightPlanCoordinates(flightPlan);
  if (routePoints.length < 2) return;

  const latLngs = getMapRouteLatLngs(routePoints, Number(flight.longitude));
  const routeLayer = L.layerGroup();

  L.polyline(latLngs, {
    pane: "selectedRoute",
    interactive: false,
    color: "#ffffff",
    weight: 4,
    opacity: 0.68,
    dashArray: "1 7",
    lineCap: "round",
    lineJoin: "round",
  }).addTo(routeLayer);

  L.polyline(latLngs, {
    pane: "selectedRoute",
    interactive: false,
    color: "#0ea5e9",
    weight: 2,
    opacity: 0.92,
    dashArray: "1 7",
    lineCap: "round",
    lineJoin: "round",
  }).addTo(routeLayer);

  routeLayer.addTo(map);
  state.selectedRouteLayer = routeLayer;
}

function clearSelectedRoute() {
  if (!state.selectedRouteLayer) return;
  map.removeLayer(state.selectedRouteLayer);
  state.selectedRouteLayer = null;
}

function getMapRouteLatLngs(routePoints, aircraftLongitude) {
  const first = routePoints[0];
  let previousLongitude = first.longitude;

  if (Number.isFinite(aircraftLongitude)) {
    while (previousLongitude - aircraftLongitude > 180) previousLongitude -= 360;
    while (previousLongitude - aircraftLongitude < -180) previousLongitude += 360;
  }

  return routePoints.map((point, index) => {
    let longitude = index === 0 ? previousLongitude : point.longitude;
    if (index > 0) {
      while (longitude - previousLongitude > 180) longitude -= 360;
      while (longitude - previousLongitude < -180) longitude += 360;
    }
    previousLongitude = longitude;
    return [point.latitude, longitude];
  });
}

function renderRouteMetrics(flight) {
  const flightPlan = state.flightPlansByFlightId.get(getFlightId(flight));
  const metrics = calculateRouteMetrics(flight, flightPlan);

  if (!metrics) {
    elements.routeEstimateStatus.textContent = flightPlan ? "Route unavailable" : "Loading route…";
    elements.plannedDistanceValue.textContent = "-";
    elements.travelledDistanceValue.textContent = "-";
    elements.remainingDistanceValue.textContent = "-";
    elements.routeProgressValue.textContent = "-";
    elements.remainingTimeValue.textContent = "-";
    elements.etaValue.textContent = "-";
    setRouteProgressBar(0);
    return;
  }

  elements.routeEstimateStatus.textContent = metrics.offRouteNm > 25
    ? `${formatNauticalMiles(metrics.offRouteNm)} off route`
    : "Flight-plan estimate";
  elements.plannedDistanceValue.textContent = formatNauticalMiles(metrics.totalNm);
  elements.travelledDistanceValue.textContent = formatNauticalMiles(metrics.travelledNm);
  elements.remainingDistanceValue.textContent = formatNauticalMiles(metrics.remainingNm);
  elements.routeProgressValue.textContent = `${Math.round(metrics.progressPercent)}%`;
  elements.remainingTimeValue.textContent = formatDuration(metrics.remainingHours);
  elements.etaValue.textContent = formatEta(metrics.remainingHours);
  setRouteProgressBar(metrics.progressPercent);
}

function setRouteProgressBar(percent) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  elements.routeProgressBar.style.setProperty("--route-progress", `${safePercent}%`);
  elements.routeProgressBar.setAttribute("aria-valuenow", String(Math.round(safePercent)));
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

function formatCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number.toFixed(4);
}

function calculateRouteMetrics(flight, flightPlan) {
  if (!flightPlan) return null;

  const routePoints = getFlightPlanCoordinates(flightPlan);
  const aircraft = normalizeCoordinate({ latitude: flight.latitude, longitude: flight.longitude });
  if (routePoints.length < 2 || !aircraft) return null;

  let totalNm = 0;
  let bestProjection = null;

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const start = routePoints[index];
    const end = routePoints[index + 1];
    const segmentNm = haversineNm(start, end);
    if (!Number.isFinite(segmentNm) || segmentNm <= 0) continue;

    const projection = projectCoordinateOntoSegment(aircraft, start, end);
    const travelledNm = totalNm + segmentNm * projection.fraction;
    if (!bestProjection || projection.distanceNm < bestProjection.distanceNm) {
      bestProjection = {
        distanceNm: projection.distanceNm,
        travelledNm,
      };
    }
    totalNm += segmentNm;
  }

  if (!bestProjection || totalNm <= 0) return null;

  const travelledNm = Math.max(0, Math.min(totalNm, bestProjection.travelledNm));
  const remainingNm = Math.max(0, totalNm - travelledNm);
  const progressPercent = (travelledNm / totalNm) * 100;
  const groundspeed = Number(flight.speed);
  const remainingHours = Number.isFinite(groundspeed) && groundspeed >= 30
    ? remainingNm / groundspeed
    : Number.NaN;

  return {
    totalNm,
    travelledNm,
    remainingNm,
    progressPercent,
    remainingHours,
    offRouteNm: bestProjection.distanceNm,
  };
}

function getFlightPlanCoordinates(flightPlan) {
  const coordinates = [];
  const items = Array.isArray(flightPlan.flightPlanItems) ? flightPlan.flightPlanItems : [];

  const visitItem = (item) => {
    if (!item || typeof item !== "object") return;
    const children = Array.isArray(item.children) ? item.children : [];
    if (children.length) {
      children.forEach(visitItem);
      return;
    }
    appendRouteCoordinate(coordinates, item.location || item.coordinate || item);
  };

  items.forEach(visitItem);

  if (coordinates.length < 2 && Array.isArray(flightPlan.waypoints)) {
    flightPlan.waypoints.forEach((waypoint) => {
      if (waypoint && typeof waypoint === "object") {
        appendRouteCoordinate(coordinates, waypoint.location || waypoint.coordinate || waypoint);
      }
    });
  }

  return coordinates;
}

function appendRouteCoordinate(coordinates, value) {
  const coordinate = normalizeCoordinate(value);
  if (!coordinate) return;
  const previous = coordinates[coordinates.length - 1];
  if (previous && haversineNm(previous, coordinate) < 0.01) return;
  coordinates.push(coordinate);
}

function normalizeCoordinate(value) {
  if (!value || typeof value !== "object") return null;
  const latitude = Number(value.latitude ?? value.lat);
  const longitude = Number(value.longitude ?? value.lng ?? value.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

function haversineNm(start, end) {
  const startLat = toRadians(start.latitude);
  const endLat = toRadians(end.latitude);
  const deltaLat = endLat - startLat;
  const deltaLon = toRadians(normalizeLongitudeDelta(end.longitude - start.longitude));
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const haversine = sinLat * sinLat + Math.cos(startLat) * Math.cos(endLat) * sinLon * sinLon;
  const angle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));
  return EARTH_RADIUS_NM * angle;
}

function projectCoordinateOntoSegment(point, start, end) {
  const latitudeScale = EARTH_RADIUS_NM;
  const longitudeScale = EARTH_RADIUS_NM * Math.cos(toRadians(point.latitude));
  const startX = toRadians(normalizeLongitudeDelta(start.longitude - point.longitude)) * longitudeScale;
  const startY = toRadians(start.latitude - point.latitude) * latitudeScale;
  const endX = toRadians(normalizeLongitudeDelta(end.longitude - point.longitude)) * longitudeScale;
  const endY = toRadians(end.latitude - point.latitude) * latitudeScale;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  const rawFraction = lengthSquared > 0
    ? -(startX * deltaX + startY * deltaY) / lengthSquared
    : 0;
  const fraction = Math.max(0, Math.min(1, rawFraction));
  const projectedX = startX + deltaX * fraction;
  const projectedY = startY + deltaY * fraction;

  return {
    fraction,
    distanceNm: Math.hypot(projectedX, projectedY),
  };
}

function normalizeLongitudeDelta(value) {
  return ((value + 540) % 360) - 180;
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function formatNauticalMiles(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString()} NM`;
}

function formatDuration(hours) {
  if (!Number.isFinite(hours) || hours < 0) return "-";
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
}

function formatEta(hours) {
  if (!Number.isFinite(hours) || hours < 0) return "-";
  const now = new Date();
  const eta = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(eta);
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const etaDayUtc = Date.UTC(eta.getUTCFullYear(), eta.getUTCMonth(), eta.getUTCDate());
  const dayOffset = Math.round((etaDayUtc - todayUtc) / (24 * 60 * 60 * 1000));
  return `${time} Z${dayOffset > 0 ? ` +${dayOffset}` : ""}`;
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
