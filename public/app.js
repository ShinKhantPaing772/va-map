const PROXY_API_BASE = "/ifapi";
const SESSION_REFRESH_MS = 10 * 60 * 1000;
const FLIGHT_REFRESH_MS = 15 * 1000;
const IDLE_STOP_MS = 5 * 60 * 1000;
const SIDEBAR_STORAGE_KEY = "czvg-pilot-sidebar-hidden";
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
  flightsList: document.querySelector("#flightsList"),
  sidebarFlightCount: document.querySelector("#sidebarFlightCount"),
  sidebarToggleCount: document.querySelector("#sidebarToggleCount"),
  hideSidebarButton: document.querySelector("#hideSidebarButton"),
  showSidebarButton: document.querySelector("#showSidebarButton"),
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
  flightPlanWaypoints: document.querySelector("#flightPlanWaypoints"),
  aircraftValue: document.querySelector("#aircraftValue"),
  liveryValue: document.querySelector("#liveryValue"),
  pilotSearchInput: document.querySelector("#pilotSearchInput"),
  searchClearButton: document.querySelector("#searchClearButton"),
  demoToggleButton: document.querySelector("#demoToggleButton"),
  emptyDemoButton: document.querySelector("#emptyDemoButton"),
  airborneLabel: document.querySelector("#airborneLabel"),
  demoBtnLabel: document.querySelector("#demoBtnLabel"),
  pilotsBtnLabel: document.querySelector("#pilotsBtnLabel"),
  langToggleButton: document.querySelector("#langToggleButton"),
  langBtnLabel: document.querySelector("#langBtnLabel"),
  flightsSidebarTitle: document.querySelector("#flightsSidebarTitle"),
  toast: document.querySelector("#toast"),
};

const LOCALE_STORAGE_KEY = "czvg:locale";

function detectInitialLocale() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("lang") || params.get("locale");
    if (fromQuery === "zh" || fromQuery === "en") return fromQuery;
  } catch {
    // Ignore URL parsing errors
  }
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === "zh" || saved === "en") return saved;
  } catch {
    // Ignore storage errors
  }
  const browserLang = (navigator.language || "").toLowerCase();
  return browserLang.startsWith("zh") ? "zh" : "en";
}

const I18N = {
  en: {
    airborne: "Airborne",
    demoData: "Demo Data",
    pilots: "Pilots",
    fleetTitle: "CZVG Fleet",
    filterPlaceholder: "Filter fleet...",
    noMatchingTitle: "No matching flights",
    noMatchingSub: (q) => `No flights matching "${q}"`,
    noAirborneTitle: "No CZVG pilots airborne",
    noAirborneSub: "The live roster will update automatically.",
    loadSimFlights: "Load Simulated Flights",
    origin: "Origin",
    destination: "Destination",
    altitude: "Altitude",
    speed: "Speed",
    heading: "Heading",
    eta: "ETA",
    route: "Route",
    leftSuffix: "left",
    statusLive: "Live",
    statusDemo: "Demo",
    statusScanning: "Scanning",
    statusConnecting: "Connecting",
    statusReconnecting: "Reconnecting",
    statusPaused: "Paused",
    statusOffline: "Offline",
    statusSimReady: "Sim Ready",
    toastSimActive: "Simulated CZVG Fleet activated.",
    toastLiveResumed: "Resumed live Expert Server tracking.",
    radarStandby: "Radar Standby",
    pausedTitle: "Live updates paused",
    pausedDesc: "Flight radar polling was paused after 5 minutes of inactivity.",
    resumeLiveRadar: "Resume Live Radar",
    scanningTitle: "Scanning Expert Server",
    scanningSub: "Active CZVG flights will appear here.",
    directVectors: "Direct / Vectors",
    noFlightPlanFiled: "No flight plan filed.",
    routeUnavailable: "Route unavailable",
    loading: "Loading…",
    offRoute: "off route",
    flightPlanEstimate: "Flight-plan estimate",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fitFlights: "Fit flights",
    close: "Close",
  },
  zh: {
    airborne: "在飞",
    demoData: "演示数据",
    pilots: "机组",
    fleetTitle: "南航机队",
    filterPlaceholder: "搜索航班或飞行员...",
    noMatchingTitle: "无匹配航班",
    noMatchingSub: (q) => `未找到匹配 "${q}" 的航班`,
    noAirborneTitle: "暂无在飞航班",
    noAirborneSub: "实时机队将自动刷新。",
    loadSimFlights: "加载演示航班",
    origin: "始发",
    destination: "目的",
    altitude: "高度",
    speed: "地速",
    heading: "航向",
    eta: "预计到达",
    route: "航路",
    leftSuffix: "剩余",
    statusLive: "实时",
    statusDemo: "演示",
    statusScanning: "扫描中",
    statusConnecting: "连接中",
    statusReconnecting: "重连中",
    statusPaused: "已暂停",
    statusOffline: "离线",
    statusSimReady: "演示就绪",
    toastSimActive: "已启用模拟机队。",
    toastLiveResumed: "已恢复实时雷达追踪。",
    radarStandby: "雷达待机",
    pausedTitle: "实时追踪已暂停",
    pausedDesc: "由于 5 分钟未操作，航班雷达已自动进入待机状态。",
    resumeLiveRadar: "恢复实时雷达",
    scanningTitle: "正在扫描服务器",
    scanningSub: "在飞航班将在此显示。",
    directVectors: "直飞 / 雷达引导",
    noFlightPlanFiled: "未提交飞行计划",
    routeUnavailable: "暂无航路",
    loading: "加载中…",
    offRoute: "偏离航路",
    flightPlanEstimate: "计划航路预估",
    zoomIn: "放大",
    zoomOut: "缩小",
    fitFlights: "聚焦所有在飞航班",
    close: "关闭",
  },
};

const state = {
  locale: detectInitialLocale(),
  connectionStatusKey: "connecting",
  connectionLabelKey: "statusConnecting",
  running: false,
  paused: false,
  demoMode: false,
  filterQuery: "",
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

const DEMO_FLIGHTS = [
  {
    flightId: "demo-csn327",
    callsign: "CSN327VG",
    username: "Capt_Li",
    virtualOrganization: "China Southern Virtual",
    matchReason: "China Southern VG",
    latitude: 31.85,
    longitude: 125.40,
    altitude: 39000,
    speed: 492,
    heading: 68,
    verticalSpeed: 0,
    originAirport: "ZGGG",
    destinationAirport: "RJAA",
    aircraftName: "Airbus A350-900",
    liveryName: "China Southern Airlines",
    route: "ZGGG LIG WHA P23 KANSU RJAA",
    flightPlanCoordinates: [
      { latitude: 23.39, longitude: 113.30 },
      { latitude: 26.50, longitude: 116.80 },
      { latitude: 31.85, longitude: 125.40 },
      { latitude: 33.20, longitude: 133.10 },
      { latitude: 35.76, longitude: 140.38 },
    ],
  },
  {
    flightId: "demo-csn301",
    callsign: "CSN301VG",
    username: "FirstOfficer_Chen",
    virtualOrganization: "[CZVG] Senior Pilot",
    matchReason: "China Southern VG",
    latitude: 1.35,
    longitude: 119.80,
    altitude: 35000,
    speed: 476,
    heading: 158,
    verticalSpeed: 0,
    originAirport: "ZGGG",
    destinationAirport: "YSSY",
    aircraftName: "Boeing 777-300ER",
    liveryName: "China Southern Airlines",
    route: "ZGGG SIKOU BUNTA YSSY",
    flightPlanCoordinates: [
      { latitude: 23.39, longitude: 113.30 },
      { latitude: 12.00, longitude: 116.00 },
      { latitude: 1.35, longitude: 119.80 },
      { latitude: -15.00, longitude: 128.00 },
      { latitude: -33.94, longitude: 151.17 },
    ],
  },
  {
    flightId: "demo-csn399",
    callsign: "CSN399VG",
    username: "Pilot_Wang",
    virtualOrganization: "CZVG Operations",
    matchReason: "China Southern VG",
    latitude: 53.20,
    longitude: 48.60,
    altitude: 38000,
    speed: 465,
    heading: 295,
    verticalSpeed: 0,
    originAirport: "ZGSZ",
    destinationAirport: "EDDF",
    aircraftName: "Boeing 787-9 Dreamliner",
    liveryName: "China Southern Airlines",
    route: "ZGSZ POLHO MORIT KUBER EDDF",
    flightPlanCoordinates: [
      { latitude: 22.63, longitude: 113.81 },
      { latitude: 38.00, longitude: 85.00 },
      { latitude: 53.20, longitude: 48.60 },
      { latitude: 52.00, longitude: 20.00 },
      { latitude: 50.03, longitude: 8.57 },
    ],
  },
  {
    flightId: "demo-csn673",
    callsign: "CSN673VG",
    username: "SkyWalker",
    virtualOrganization: "[CZVG]",
    matchReason: "China Southern VG",
    latitude: 14.20,
    longitude: 106.50,
    altitude: 37000,
    speed: 458,
    heading: 195,
    verticalSpeed: 0,
    originAirport: "ZBAD",
    destinationAirport: "WSSS",
    aircraftName: "Airbus A330-300",
    liveryName: "China Southern Airlines",
    route: "ZBAD WHA GURBO WSSS",
    flightPlanCoordinates: [
      { latitude: 39.50, longitude: 116.41 },
      { latitude: 28.00, longitude: 112.00 },
      { latitude: 14.20, longitude: 106.50 },
      { latitude: 1.36, longitude: 103.99 },
    ],
  },
];

const map = L.map("map", {
  worldCopyJump: true,
  zoomControl: false,
  preferCanvas: true,
}).setView([31.2, 105.9], 4);

const selectedRoutePane = map.createPane("selectedRoute");
selectedRoutePane.style.zIndex = "450";
selectedRoutePane.style.pointerEvents = "none";

loadBasemap();

async function loadBasemap() {
  let cartoKey = "";
  try {
    const response = await fetch("/map-config", { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const config = await response.json();
      if (typeof config.cartoBasemapApiKey === "string" && config.cartoBasemapApiKey.trim()) {
        cartoKey = config.cartoBasemapApiKey.trim();
      }
    }
  } catch {
    // OpenStreetMap fallback will be used
  }

  const options = {
    maxZoom: 19,
    updateWhenIdle: true,
    keepBuffer: 4,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  };

  // Use direct basemaps.cartocdn.com URL without sharding subdomains or retina suffixes
  const tileUrl = cartoKey
    ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoKey)}`
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  const layer = L.tileLayer(tileUrl, options);
  layer.addTo(map);
}

requestAnimationFrame(() => {
  map.invalidateSize();
  window.setTimeout(() => map.invalidateSize(), 250);
});

window.addEventListener("load", () => map.invalidateSize());
window.addEventListener("resize", () => map.invalidateSize());
window.addEventListener("load", () => startTracking());

if (elements.closePanelButton) elements.closePanelButton.addEventListener("click", closeSelectedFlight);
if (elements.resumeTrackingButton) elements.resumeTrackingButton.addEventListener("click", resumeTracking);
if (elements.zoomInButton) elements.zoomInButton.addEventListener("click", () => map.zoomIn());
if (elements.zoomOutButton) elements.zoomOutButton.addEventListener("click", () => map.zoomOut());
if (elements.resetMapButton) elements.resetMapButton.addEventListener("click", fitToFlights);
if (elements.hideSidebarButton) elements.hideSidebarButton.addEventListener("click", () => setSidebarHidden(true));
if (elements.showSidebarButton) elements.showSidebarButton.addEventListener("click", () => setSidebarHidden(false));

if (elements.demoToggleButton) {
  elements.demoToggleButton.addEventListener("click", toggleDemoFleet);
}

if (elements.langToggleButton) {
  elements.langToggleButton.addEventListener("click", () => {
    setLocale(state.locale === "zh" ? "en" : "zh");
  });
}

window.addEventListener("storage", (e) => {
  if (e.key === LOCALE_STORAGE_KEY && (e.newValue === "zh" || e.newValue === "en")) {
    setLocale(e.newValue, false);
  }
});

window.addEventListener("message", (event) => {
  if (event.data && typeof event.data === "object") {
    if (event.data.type === "czvg:locale" && (event.data.locale === "zh" || event.data.locale === "en")) {
      setLocale(event.data.locale, false);
    }
  }
});

function t(key) {
  return I18N[state.locale]?.[key] || I18N.en[key] || key;
}

function setLocale(nextLocale, persist = true) {
  state.locale = nextLocale === "zh" ? "zh" : "en";
  if (persist) {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, state.locale);
    } catch {
      // Ignore storage errors
    }
  }
  applyLocaleStrings();
  renderFlightsSidebar(state.flights);
  if (state.selectedFlightId) {
    const selected = state.flights.find((item) => getFlightId(item) === String(state.selectedFlightId));
    if (selected) renderSelectedFlight(selected);
  }
}

function applyLocaleStrings() {
  document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";
  if (elements.airborneLabel) elements.airborneLabel.textContent = t("airborne");
  if (elements.demoBtnLabel) elements.demoBtnLabel.textContent = t("demoData");
  if (elements.pilotsBtnLabel) elements.pilotsBtnLabel.textContent = t("pilots");
  if (elements.langBtnLabel) elements.langBtnLabel.textContent = state.locale === "zh" ? "EN" : "中文";
  if (elements.flightsSidebarTitle) elements.flightsSidebarTitle.textContent = t("fleetTitle");
  if (elements.pilotSearchInput) elements.pilotSearchInput.placeholder = t("filterPlaceholder");

  const depLabel = document.querySelector(".departure-node span");
  const arrLabel = document.querySelector(".arrival-node span");
  if (depLabel) depLabel.textContent = t("origin");
  if (arrLabel) arrLabel.textContent = t("destination");

  const hudLabels = document.querySelectorAll(".hud-stat-label");
  if (hudLabels.length >= 4) {
    hudLabels[0].textContent = t("altitude");
    hudLabels[1].textContent = t("speed");
    hudLabels[2].textContent = t("heading");
    hudLabels[3].textContent = t("eta");
  }

  const wpCaption = document.querySelector(".waypoints-caption");
  if (wpCaption) wpCaption.textContent = t("route");

  // Inactivity overlay
  const inactTag = document.querySelector(".inactivity-tag");
  if (inactTag) inactTag.textContent = t("radarStandby");
  const inactTitle = document.querySelector("#inactivityTitle");
  if (inactTitle) inactTitle.textContent = t("pausedTitle");
  const inactDesc = document.querySelector(".inactivity-dialog-card p");
  if (inactDesc) inactDesc.textContent = t("pausedDesc");
  if (elements.resumeTrackingButton) {
    const resumeSpan = elements.resumeTrackingButton.querySelector("span");
    if (resumeSpan) resumeSpan.textContent = t("resumeLiveRadar");
  }

  // Initial scanning block in empty list
  const emptyBlock = document.querySelector(".flights-list-empty");
  if (emptyBlock) {
    const strong = emptyBlock.querySelector("strong");
    if (strong) strong.textContent = t("scanningTitle");
    const span = emptyBlock.querySelector("span:not(.material-symbols-rounded)");
    if (span) span.textContent = t("scanningSub");
    const demoBtnSpan = emptyBlock.querySelector(".empty-action-btn span");
    if (demoBtnSpan) demoBtnSpan.textContent = t("loadSimFlights");
  }

  // Toolbars & icons
  if (elements.zoomInButton) elements.zoomInButton.title = t("zoomIn");
  if (elements.zoomOutButton) elements.zoomOutButton.title = t("zoomOut");
  if (elements.resetMapButton) elements.resetMapButton.title = t("fitFlights");
  if (elements.hideSidebarButton) elements.hideSidebarButton.title = t("close");

  if (state.connectionLabelKey && elements.connectionLabel) {
    elements.connectionLabel.textContent = t(state.connectionLabelKey);
  }
}

if (elements.emptyDemoButton) {
  elements.emptyDemoButton.addEventListener("click", () => {
    if (!state.demoMode) toggleDemoFleet();
  });
}

if (elements.pilotSearchInput) {
  elements.pilotSearchInput.addEventListener("input", (e) => {
    state.filterQuery = e.target.value;
    if (elements.searchClearButton) {
      elements.searchClearButton.hidden = !state.filterQuery;
    }
    renderFlightsSidebar(state.flights);
  });
}

if (elements.searchClearButton) {
  elements.searchClearButton.addEventListener("click", () => {
    state.filterQuery = "";
    if (elements.pilotSearchInput) elements.pilotSearchInput.value = "";
    elements.searchClearButton.hidden = true;
    renderFlightsSidebar(state.flights);
  });
}

restoreSidebarPreference();
applyLocaleStrings();

document.addEventListener("pointerdown", resetIdleTimer, { passive: true });
document.addEventListener("keydown", resetIdleTimer);

function toggleDemoFleet() {
  state.demoMode = !state.demoMode;
  if (state.demoMode) {
    elements.demoToggleButton?.classList.add("is-active");
    loadDemoData();
    showToast(t("toastSimActive"));
  } else {
    elements.demoToggleButton?.classList.remove("is-active");
    state.flightPlansByFlightId.clear();
    state.flights = [];
    renderMarkers([]);
    renderFlightsSidebar([]);
    renderSelectedFlight(null);
    setConnectionState("connecting", "statusReconnecting");
    loadFlights();
    showToast(t("toastLiveResumed"));
  }
}

function loadDemoData() {
  state.flights = DEMO_FLIGHTS.map((f) => ({ ...f }));
  DEMO_FLIGHTS.forEach((f) => {
    state.flightPlansByFlightId.set(f.flightId, {
      originAirport: f.originAirport,
      destinationAirport: f.destinationAirport,
      route: f.route,
      waypoints: f.flightPlanCoordinates,
    });
  });

  setConnectionState("live", "statusDemo");
  if (elements.matchCount) elements.matchCount.textContent = String(state.flights.length);
  if (elements.totalCount) elements.totalCount.textContent = "1,248";
  if (elements.updatedAt) elements.updatedAt.textContent = formatUpdatedAt(new Date());
  elements.mapShell.classList.remove("is-loading");

  renderMarkers(state.flights);
  renderFlightsSidebar(state.flights);
  if (!state.hasFitBounds) {
    fitToFlights();
    state.hasFitBounds = true;
  }
}

function closeSelectedFlight() {
  state.selectedFlightId = null;
  renderSelectedFlight(null);
  renderMarkers(state.flights);
  renderFlightsSidebar(state.flights);
}

function restoreSidebarPreference() {
  const isHidden = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  setSidebarHidden(isHidden, false);
}

function setSidebarHidden(hidden, persist = true) {
  elements.mapShell.classList.toggle("sidebar-hidden", hidden);
  elements.showSidebarButton.setAttribute("aria-expanded", String(!hidden));
  if (persist) {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(hidden));
    } catch {
      // Storage unavailable
    }
  }
  requestAnimationFrame(() => map.invalidateSize());
}

function resetIdleTimer() {
  window.clearTimeout(state.idleTimer);
  if (state.paused) return;
  state.idleTimer = window.setTimeout(pauseTracking, IDLE_STOP_MS);
}

function pauseTracking() {
  state.paused = true;
  window.clearTimeout(state.refreshTimer);
  setConnectionState("paused", "statusPaused");
  elements.inactivityOverlay.hidden = false;
  elements.mapShell.setAttribute("aria-busy", "false");
}

function resumeTracking() {
  elements.inactivityOverlay.hidden = true;
  state.paused = false;
  resetIdleTimer();
  setConnectionState("connecting", "statusConnecting");
  refreshLoop();
}

function setConnectionState(status, labelKeyOrText) {
  state.connectionStatusKey = status;
  state.connectionLabelKey = labelKeyOrText;
  elements.connectionStatus.dataset.state = status;
  elements.connectionLabel.textContent = t(labelKeyOrText);
}

async function startTracking() {
  if (state.running) return;
  state.running = true;
  resetIdleTimer();
  await refreshLoop();
}

async function refreshLoop() {
  if (state.paused) return;
  if (!state.demoMode) {
    await loadFlights();
  }
  window.clearTimeout(state.refreshTimer);
  if (!state.paused) {
    state.refreshTimer = window.setTimeout(refreshLoop, FLIGHT_REFRESH_MS);
  }
}

async function loadFlights() {
  try {
    setConnectionState("connecting", "statusScanning");
    await ensureExpertSession();
    await loadReferenceData();

    const result = await request(`/sessions/${state.expertSessionId}/flights`, { includeMeta: true });
    const flights = normalizeResultArray(result.payload);
    const matched = [];

    flights.forEach((flight) => {
      const matchReason = getMatchReason(flight);
      if (matchReason) {
        matched.push({ ...flight, matchReason });
      }
    });

    matched.sort(sortFlights);
    state.flights = matched;

    if (elements.matchCount) elements.matchCount.textContent = String(matched.length);
    if (elements.totalCount) elements.totalCount.textContent = String(flights.length);
    if (elements.updatedAt) elements.updatedAt.textContent = formatUpdatedAt(result.fetchedAt);
    setConnectionState("live", "statusLive");
    elements.mapShell.classList.remove("is-loading");
    elements.mapShell.setAttribute("aria-busy", "false");

    renderMarkers(matched);
    renderFlightsSidebar(matched);

    if (state.selectedFlightId) {
      const selected = matched.find((item) => getFlightId(item) === String(state.selectedFlightId));
      if (selected) {
        renderSelectedFlight(selected);
      } else {
        closeSelectedFlight();
      }
    }

    if (!state.hasFitBounds && matched.length) {
      fitToFlights();
      state.hasFitBounds = true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach Infinite Flight API.";
    if (message.includes("INFINITE_FLIGHT_API_KEY") || message.includes("503")) {
      setConnectionState("offline", "statusSimReady");
      if (!state.demoMode && state.flights.length === 0) {
        loadDemoData();
        state.demoMode = true;
        elements.demoToggleButton?.classList.add("is-active");
        showToast(t("toastSimActive"));
        return;
      }
    } else {
      setConnectionState("offline", "statusOffline");
    }
    elements.mapShell.classList.remove("is-loading");
    elements.mapShell.setAttribute("aria-busy", "false");
    showToast(message);
  }
}

async function ensureExpertSession() {
  const sessionValid = state.expertSessionId && Date.now() - state.sessionLastLoaded < SESSION_REFRESH_MS;
  if (sessionValid) return;

  const payload = await request("/sessions");
  const sessions = normalizeResultArray(payload);
  const expert = sessions.find((session) => {
    const name = String(session.name || session.sessionName || "").toLowerCase();
    return name.includes("expert") || session.id === "expert";
  });

  if (!expert) {
    throw new Error("Expert Server session was not found in Live API response.");
  }

  state.expertSessionId = expert.id;
  state.sessionLastLoaded = Date.now();
}

async function request(path, options = {}) {
  const response = await fetch(`${PROXY_API_BASE}${path}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("API proxy endpoint /ifapi not found. Run server with `node server.mjs`.");
    }
    if (response.status === 503) {
      throw new Error("Add INFINITE_FLIGHT_API_KEY to .env, then restart server.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Infinite Flight API rejected authorization key.");
    }
    throw new Error(`Infinite Flight API returned status ${response.status}.`);
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

function normalizeResultArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
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
    const id = getFlightId(flight);
    activeIds.add(id);
    const lat = Number(flight.latitude);
    const lon = Number(flight.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const latLng = [lat, lon];
    const isSelected = String(state.selectedFlightId) === id;
    const existing = state.markers.get(id);

    if (existing) {
      existing.marker.setLatLng(latLng);
      existing.marker.setIcon(makePlaneIcon(flight, isSelected));
      existing.marker.setTooltipContent(makeFlightTooltip(flight));
      if (isSelected) existing.marker.setZIndexOffset(1000);
      else existing.marker.setZIndexOffset(0);
      return;
    }

    const marker = L.marker(latLng, {
      icon: makePlaneIcon(flight, isSelected),
      riseOnHover: true,
      keyboard: true,
    });

    marker.bindTooltip(makeFlightTooltip(flight), {
      className: "flight-tooltip",
      direction: "top",
      offset: [0, -18],
      opacity: 1,
    });

    marker.on("click", () => focusFlight(id));
    marker.addTo(map);

    state.markers.set(id, { marker, flightId: id });
  });

  state.markers.forEach((stored, id) => {
    if (!activeIds.has(id)) {
      map.removeLayer(stored.marker);
      state.markers.delete(id);
    }
  });
}

function renderFlightsSidebar(flights) {
  const previousScrollTop = elements.flightsList.scrollTop;
  if (elements.sidebarFlightCount) elements.sidebarFlightCount.textContent = String(flights.length);
  if (elements.sidebarToggleCount) elements.sidebarToggleCount.textContent = String(flights.length);

  const query = (state.filterQuery || "").trim().toLowerCase();
  const filtered = query
    ? flights.filter((f) => {
        const details = getFlightDetails(f);
        return (
          details.callsign.toLowerCase().includes(query) ||
          details.username.toLowerCase().includes(query) ||
          details.origin.toLowerCase().includes(query) ||
          details.destination.toLowerCase().includes(query) ||
          details.aircraft.toLowerCase().includes(query)
        );
      })
    : flights;

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "flights-list-empty";
    const subText = query
      ? I18N[state.locale].noMatchingSub(escapeHtml(query))
      : escapeHtml(t("noAirborneSub"));
    empty.innerHTML = `
      <span class="material-symbols-rounded empty-radar-icon">search_off</span>
      <strong>${escapeHtml(query ? t("noMatchingTitle") : t("noAirborneTitle"))}</strong>
      <span>${subText}</span>
    `;

    if (!query && !state.demoMode) {
      const demoBtn = document.createElement("button");
      demoBtn.type = "button";
      demoBtn.className = "empty-action-btn";
      demoBtn.innerHTML = `<span>${escapeHtml(t("loadSimFlights"))}</span>`;
      demoBtn.addEventListener("click", toggleDemoFleet);
      empty.appendChild(demoBtn);
    }

    elements.flightsList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((flight) => {
    const details = getFlightDetails(flight);
    const id = getFlightId(flight);
    const selected = id === String(state.selectedFlightId);

    const item = document.createElement("button");
    item.type = "button";
    item.className = "flight-list-row";
    item.dataset.flightId = id;
    item.setAttribute("aria-pressed", String(selected));
    item.setAttribute("aria-label", `View ${details.callsign}, flown by ${details.username}`);
    if (selected) item.classList.add("is-selected");

    item.innerHTML = `
      <div class="row-main">
        <div class="row-header">
          <strong class="row-callsign">${escapeHtml(details.callsign)}</strong>
          <span class="row-aircraft">${escapeHtml(formatAircraftBadge(details.aircraft))}</span>
        </div>
        <div class="row-route">
          <span>${escapeHtml(details.origin)} → ${escapeHtml(details.destination)}</span>
          <span class="row-telemetry">${formatFlightLevel(flight.altitude)} · ${formatNumber(flight.speed, " kt")}</span>
        </div>
        <div class="row-pilot">
          <span>${escapeHtml(details.username)}</span>
        </div>
      </div>
    `;

    item.addEventListener("click", () => focusFlight(id));
    fragment.append(item);
  });

  elements.flightsList.replaceChildren(fragment);
  elements.flightsList.scrollTop = previousScrollTop;
}

function formatAircraftBadge(aircraftName) {
  const cleaned = String(aircraftName || "")
    .replace(/^(Airbus|Boeing|Comac|Embraer|Bombardier|McDonnell Douglas)\s+/i, "")
    .replace(/\s+Dreamliner$/i, "")
    .trim();
  if (!cleaned || cleaned === "Commercial Jet") return "JET";
  return cleaned.split(/\s+/)[0] || "A350";
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function makePlaneIcon(flight, selected = false) {
  const element = makePlaneMarkerElement(flight);
  const heading = normalizeHeading(flight.heading);
  element.style.setProperty("--heading", `${heading}deg`);
  if (selected) element.classList.add("is-selected");
  return L.divIcon({
    className: "",
    html: element.outerHTML,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function makePlaneMarkerElement(flight) {
  const element = document.createElement("div");
  element.setAttribute("aria-label", `Select flight ${flight.callsign || ""}`);
  element.innerHTML = `<svg viewBox="0 0 24 24" class="plane-svg" aria-hidden="true">
    <path d="M12 2c-.6 0-1.1.4-1.3 1L8.5 9.5 2.2 11c-.7.2-1.2.8-1.2 1.5 0 .8.6 1.4 1.4 1.4l6.1-.5 2.5 7.6H9.8c-.4 0-.8.3-.9.7l-.4 1.3h7l-.4-1.3c-.1-.4-.5-.7-.9-.7h-1.2l2.5-7.6 6.1.5c.8 0 1.4-.6 1.4-1.4 0-.7-.5-1.3-1.2-1.5L15.5 9.5 13.3 3c-.2-.6-.7-1-1.3-1z"/>
  </svg>`;
  updateMarkerElement(element, flight.matchReason);
  return element;
}

function makeFlightTooltip(flight) {
  const details = getFlightDetails(flight);
  const tooltip = document.createElement("div");
  tooltip.className = "flight-tooltip-content";

  const header = document.createElement("div");
  header.className = "tooltip-header";
  const callsign = document.createElement("strong");
  callsign.textContent = details.callsign;
  const aircraft = document.createElement("span");
  aircraft.textContent = details.aircraft;
  header.append(callsign, aircraft);

  const metrics = document.createElement("div");
  metrics.className = "tooltip-metrics";
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

function focusFlight(flightId) {
  state.selectedFlightId = flightId;
  const target = state.flights.find((flight) => getFlightId(flight) === flightId);
  if (!target) return;

  const lat = Number(target.latitude);
  const lon = Number(target.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    map.setView([lat, lon], Math.max(map.getZoom(), 6), { animate: true });
  }

  renderSelectedFlight(target);
  renderMarkers(state.flights);
  renderFlightsSidebar(state.flights);
}

function renderSelectedFlight(flight) {
  if (!flight) {
    elements.selectedPanel.hidden = true;
    elements.mapShell.classList.remove("has-selected-flight");
    clearSelectedRoute();
    return;
  }

  const details = getFlightDetails(flight);
  hydrateFlightPlanForFlight(flight);
  elements.selectedPanel.hidden = false;
  elements.selectedCallsign.textContent = details.callsign;
  elements.pilotName.textContent = details.username;
  if (elements.pilotOrg) elements.pilotOrg.textContent = details.organization;
  elements.originCode.textContent = details.origin;
  elements.destinationCode.textContent = details.destination;
  elements.altitudeValue.textContent = formatNumber(flight.altitude, " ft");
  elements.speedValue.textContent = formatNumber(flight.speed, " kts");
  elements.headingValue.textContent = formatNumber(flight.heading, "°");
  renderRouteMetrics(flight);
  renderSelectedRoute(flight);
  if (elements.flightPlanValue) elements.flightPlanValue.textContent = details.flightPlan;
  elements.aircraftValue.textContent = details.aircraft;
  elements.liveryValue.textContent = details.livery;

  // Waypoints inline trail
  if (elements.flightPlanWaypoints) {
    elements.flightPlanWaypoints.innerHTML = "";
    const routeText = details.flightPlan || "";
    const codes = routeText.split(/[\s,→\-]+/).map((s) => s.trim()).filter(Boolean);
    if (codes.length > 0) {
      codes.forEach((code, idx) => {
        if (idx > 0) {
          const arrow = document.createElement("span");
          arrow.className = "wp-arrow";
          arrow.textContent = "→";
          elements.flightPlanWaypoints.appendChild(arrow);
        }
        const span = document.createElement("span");
        span.className = "wp-code";
        if (idx === 0 || idx === codes.length - 1) {
          span.classList.add("is-end");
        }
        span.textContent = code;
        elements.flightPlanWaypoints.appendChild(span);
      });
    } else {
      elements.flightPlanWaypoints.textContent = t("directVectors");
    }
  }
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
    opacity: 0.9,
    dashArray: "2 6",
    lineCap: "round",
    lineJoin: "round",
  }).addTo(routeLayer);

  L.polyline(latLngs, {
    pane: "selectedRoute",
    interactive: false,
    color: "#0052a5",
    weight: 2.5,
    opacity: 1,
    dashArray: "2 6",
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
    if (elements.routeEstimateStatus) elements.routeEstimateStatus.textContent = flightPlan ? t("routeUnavailable") : t("loading");
    if (elements.plannedDistanceValue) elements.plannedDistanceValue.textContent = "-";
    elements.travelledDistanceValue.textContent = "-";
    elements.remainingDistanceValue.textContent = "-";
    elements.routeProgressValue.textContent = "-";
    if (elements.remainingTimeValue) elements.remainingTimeValue.textContent = "-";
    elements.etaValue.textContent = "-";
    setRouteProgressBar(0);
    return;
  }

  if (elements.routeEstimateStatus) {
    elements.routeEstimateStatus.textContent = metrics.offRouteNm > 25
      ? `${formatNauticalMiles(metrics.offRouteNm)} ${t("offRoute")}`
      : t("flightPlanEstimate");
  }
  if (elements.plannedDistanceValue) elements.plannedDistanceValue.textContent = formatNauticalMiles(metrics.totalNm);
  elements.travelledDistanceValue.textContent = formatNauticalMiles(metrics.travelledNm);
  elements.remainingDistanceValue.textContent = `${formatNauticalMiles(metrics.remainingNm)} ${t("leftSuffix")}`;
  elements.routeProgressValue.textContent = `${Math.round(metrics.progressPercent)}%`;
  if (elements.remainingTimeValue) elements.remainingTimeValue.textContent = formatDuration(metrics.remainingHours);
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

function calculateRouteMetrics(flight, flightPlan) {
  if (!flightPlan) return null;
  const routePoints = getFlightPlanCoordinates(flightPlan);
  if (routePoints.length < 2) return null;

  const lat = Number(flight.latitude);
  const lon = Number(flight.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const currentPoint = { latitude: lat, longitude: lon };
  const totalNm = calculatePolylineDistanceNm(routePoints);
  if (totalNm <= 0) return null;

  const nearest = findNearestPointOnRoute(currentPoint, routePoints);
  const travelledNm = Math.min(totalNm, calculateDistanceAlongRouteNm(routePoints, nearest.index, nearest.point));
  const remainingNm = Math.max(0, totalNm - travelledNm);
  const progressPercent = Math.max(0, Math.min(100, (travelledNm / totalNm) * 100));

  const speedKts = Math.max(1, Number(flight.speed) || 0);
  const remainingHours = speedKts > 0 ? remainingNm / speedKts : 0;

  return {
    totalNm,
    travelledNm,
    remainingNm,
    progressPercent,
    remainingHours,
    offRouteNm: nearest.distanceNm,
  };
}

function getFlightPlanCoordinates(flightPlan) {
  const candidates = [
    flightPlan.waypoints,
    flightPlan.routeCoordinates,
    flightPlan.coordinates,
    flightPlan.fixes,
    flightPlan.route,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      const parsed = candidate
        .map(normalizeCoordinatePoint)
        .filter((point) => point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
      if (parsed.length >= 2) return parsed;
    }
  }

  return [];
}

function normalizeCoordinatePoint(item) {
  if (!item) return null;
  if (Array.isArray(item) && item.length >= 2) {
    return { latitude: Number(item[0]), longitude: Number(item[1]) };
  }
  if (typeof item === "object") {
    const lat = firstText(item.latitude, item.lat, item.Latitude, item.Lat);
    const lon = firstText(item.longitude, item.lon, item.lng, item.Longitude, item.Lng);
    if (lat !== "----" && lon !== "----") {
      return { latitude: Number(lat), longitude: Number(lon) };
    }
  }
  return null;
}

function findNearestPointOnRoute(point, routePoints) {
  let best = {
    distanceNm: Number.POSITIVE_INFINITY,
    index: 0,
    point: routePoints[0],
  };

  for (let i = 0; i < routePoints.length - 1; i += 1) {
    const a = routePoints[i];
    const b = routePoints[i + 1];
    const projected = projectPointOnSegment(point, a, b);
    const distanceNm = haversineDistanceNm(point, projected);

    if (distanceNm < best.distanceNm) {
      best = { distanceNm, index: i, point: projected };
    }
  }

  return best;
}

function projectPointOnSegment(p, a, b) {
  const segLength = haversineDistanceNm(a, b);
  if (segLength <= 0.0001) return a;

  const dLat = b.latitude - a.latitude;
  const dLon = b.longitude - a.longitude;
  const t = Math.max(0, Math.min(1, ((p.latitude - a.latitude) * dLat + (p.longitude - a.longitude) * dLon) / (dLat * dLat + dLon * dLon || 1)));

  return {
    latitude: a.latitude + t * dLat,
    longitude: a.longitude + t * dLon,
  };
}

function calculateDistanceAlongRouteNm(routePoints, segmentIndex, projectedPoint) {
  let distance = 0;
  for (let i = 0; i < segmentIndex; i += 1) {
    distance += haversineDistanceNm(routePoints[i], routePoints[i + 1]);
  }
  distance += haversineDistanceNm(routePoints[segmentIndex], projectedPoint);
  return distance;
}

function calculatePolylineDistanceNm(routePoints) {
  let distance = 0;
  for (let i = 0; i < routePoints.length - 1; i += 1) {
    distance += haversineDistanceNm(routePoints[i], routePoints[i + 1]);
  }
  return distance;
}

function haversineDistanceNm(pointA, pointB) {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);
  const deltaLat = toRadians(pointB.latitude - pointA.latitude);
  const deltaLon = toRadians(pointB.longitude - pointA.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_NM * c;
}

function formatNauticalMiles(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${Math.round(number).toLocaleString()} NM`;
}

function formatDuration(hoursValue) {
  const hours = Number(hoursValue);
  if (!Number.isFinite(hours) || hours <= 0) return "-";

  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function formatEta(hoursValue) {
  const hours = Number(hoursValue);
  if (!Number.isFinite(hours) || hours <= 0) return "-";

  const eta = new Date(Date.now() + hours * 3600 * 1000);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(eta);

  return `${time} Z`;
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
    flightId,
    callsign: firstText(flight.callsign, flight.flightNumber, "Unknown Callsign"),
    username: firstText(flight.username, flight.displayName, flight.pilotName, "Anonymous Pilot"),
    organization: firstText(
      flight.virtualOrganization,
      flight.virtualOrganizationTag,
      flight.organization,
      flight.matchReason,
      "China Southern Virtual Group",
    ),
    origin,
    destination,
    aircraft: firstText(aircraft.name, flight.aircraftName, "Commercial Jet"),
    livery: firstText(aircraft.livery, flight.liveryName, "China Southern Airlines"),
    flightPlan: route === "----" ? t("noFlightPlanFiled") : route,
  };
}

function getFlightId(flight) {
  return String(flight.flightId || flight.id || flight.callsign || "");
}

async function hydrateFlightPlanForFlight(flight) {
  const flightId = getFlightId(flight);
  if (!flightId || state.demoMode || !state.expertSessionId || state.flightPlansByFlightId.has(flightId) || state.requestedFlightPlans.has(flightId)) {
    return;
  }

  state.requestedFlightPlans.add(flightId);

  try {
    const payload = await request(`/sessions/${state.expertSessionId}/flights/${flightId}/flightplan`);
    const flightPlan = payload.result && typeof payload.result === "object" ? payload.result : {};
    state.flightPlansByFlightId.set(flightId, flightPlan);

    if (String(state.selectedFlightId) === flightId) {
      const selected = state.flights.find((item) => getFlightId(item) === flightId);
      if (selected) {
        renderSelectedFlight(selected);
        renderFlightsSidebar(state.flights);
      }
    }
  } catch (error) {
    state.flightPlansByFlightId.set(flightId, {});
  }
}

function getRouteEndpoint(flightPlan, position) {
  const waypoints = normalizeRouteValues(flightPlan.waypoints);
  if (!waypoints.length) return "----";
  const item = position === "first" ? waypoints[0] : waypoints[waypoints.length - 1];
  return extractAirportCandidate(item);
}

function getFlightPlanItemRoute(flightPlan) {
  const waypoints = normalizeRouteValues(flightPlan.waypoints);
  if (!waypoints.length) return "----";
  return waypoints.map(extractAirportCandidate).filter(Boolean).join(" ");
}

function normalizeRouteValues(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}

function extractAirportCandidate(item) {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "----";
  return firstText(item.name, item.identifier, item.icao, item.fix, item.id);
}

function getAircraftInfo(flight) {
  const aircraftId = firstText(flight.aircraftId);
  const liveryId = firstText(flight.liveryId);

  const aircraft = state.aircraftById.get(aircraftId);
  const livery = state.liveryById.get(liveryId);

  return {
    name: firstText(aircraft?.name, aircraft?.aircraftName, flight.aircraftName),
    livery: firstText(livery?.name, livery?.liveryName, flight.liveryName),
  };
}

function firstText(...candidates) {
  for (const item of candidates) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (typeof item === "number" && Number.isFinite(item)) return String(item);
  }
  return "----";
}

let toastTimer = null;
function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 3500);
}
