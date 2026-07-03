const API_BASE = "https://api.infiniteflight.com/public/v2";

const CACHE_TTL = {
  sessions: 10 * 60,
  flights: 15,
  flightPlans: 60,
  aircraft: 24 * 60 * 60,
};

export async function onRequest(context) {
  const { env, params, request } = context;
  const apiKey = env.INFINITE_FLIGHT_API_KEY;

  if (!apiKey) {
    return jsonResponse({ errorMessage: "Missing INFINITE_FLIGHT_API_KEY" }, 503, "no-store");
  }

  if (request.method === "HEAD") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "GET") {
    return jsonResponse({ errorMessage: "Method not allowed" }, 405, "no-store", {
      Allow: "GET, HEAD",
    });
  }

  const url = new URL(request.url);
  const apiPath = getApiPath(params.path);
  const upstreamUrl = `${API_BASE}${apiPath}${url.search}`;
  const ttl = getCacheTtl(apiPath);
  const cache = caches.default;
  const cacheKey = new Request(upstreamUrl, { method: "GET" });

  if (ttl > 0) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return withProxyCacheHeader(cached, "HIT");
    }
  }

  const headers = new Headers({ Authorization: `Bearer ${apiKey}` });
  const acceptVersion = request.headers.get("Accept-Version");
  if (acceptVersion) headers.set("Accept-Version", acceptVersion);

  const upstream = await fetch(upstreamUrl, { headers });
  const responseHeaders = new Headers({
    "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    "Cache-Control": upstream.ok && ttl > 0 ? `public, max-age=${ttl}` : "no-store",
    "X-Proxy-Fetched-At": new Date().toISOString(),
    "X-Proxy-Cache": "MISS",
  });
  const response = new Response(upstream.body, {
    headers: responseHeaders,
    status: upstream.status,
    statusText: upstream.statusText,
  });

  if (upstream.ok && ttl > 0) {
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

function getApiPath(path) {
  const parts = Array.isArray(path) ? path : String(path || "").split("/");
  return `/${parts.map((part) => encodeURIComponent(part)).join("/")}`;
}

function getCacheTtl(apiPath) {
  if (apiPath === "/sessions") return CACHE_TTL.sessions;
  if (/^\/sessions\/[^/]+\/flights$/.test(apiPath)) return CACHE_TTL.flights;
  if (/^\/sessions\/[^/]+\/flights\/[^/]+\/flightplan$/.test(apiPath)) return CACHE_TTL.flightPlans;
  if (apiPath === "/aircraft" || apiPath.startsWith("/aircraft/")) return CACHE_TTL.aircraft;
  return 0;
}

function jsonResponse(body, status, cacheControl, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
      ...extraHeaders,
    },
    status,
  });
}

function withProxyCacheHeader(response, cacheStatus) {
  const headers = new Headers(response.headers);
  headers.set("X-Proxy-Cache", cacheStatus);
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
