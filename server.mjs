import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.infiniteflight.com/public/v2";
const root = fileURLToPath(new URL(".", import.meta.url));
await loadEnvFile(join(root, ".env"));
const port = Number(process.env.PORT || 5173);
const responseCache = new Map();

const CACHE_TTL = {
  sessions: 10 * 60 * 1000,
  flights: 15 * 1000,
  flightPlans: 60 * 1000,
  aircraft: 24 * 60 * 60 * 1000,
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);

    if (url.pathname === "/healthz") {
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify({ cacheEntries: responseCache.size, ok: true }));
      return;
    }

    if (url.pathname.startsWith("/ifapi/")) {
      await proxyInfiniteFlight(request, response, url);
      return;
    }

    await serveStatic(response, url.pathname);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Server error");
  }
}).listen(port, () => {
  console.log(`CZVG map running at http://localhost:${port}`);
});

async function proxyInfiniteFlight(request, response, url) {
  const apiKey = process.env.INFINITE_FLIGHT_API_KEY;
  if (!apiKey) {
    response.writeHead(503, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify({ errorMessage: "Missing INFINITE_FLIGHT_API_KEY in .env" }));
    return;
  }

  if (request.method === "HEAD") {
    response.writeHead(204);
    response.end();
    return;
  }

  const apiPath = url.pathname.replace(/^\/ifapi/, "");
  const cacheKey = `${apiPath}${url.search}`;
  const ttl = getCacheTtl(apiPath);
  const cached = getCachedResponse(cacheKey, ttl);

  if (cached) {
    response.writeHead(cached.status, {
      ...cached.headers,
      "X-Proxy-Cache": "HIT",
    });
    response.end(cached.body);
    return;
  }

  const headers = { Authorization: `Bearer ${apiKey}` };
  const acceptVersion = request.headers["accept-version"];
  if (acceptVersion) headers["Accept-Version"] = acceptVersion;

  const upstream = await fetch(`${API_BASE}${apiPath}${url.search}`, { headers });
  const body = Buffer.from(await upstream.arrayBuffer());
  const shouldCache = ttl > 0 && upstream.ok;
  const responseHeaders = {
    "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    "Cache-Control": shouldCache ? `private, max-age=${Math.floor(ttl / 1000)}` : "no-store",
  };

  if (shouldCache) {
    responseCache.set(cacheKey, {
      body,
      headers: responseHeaders,
      status: upstream.status,
      timestamp: Date.now(),
    });
  }

  response.writeHead(upstream.status, {
    ...responseHeaders,
    "X-Proxy-Cache": "MISS",
  });
  response.end(body);
}

function getCacheTtl(apiPath) {
  if (apiPath === "/sessions") return CACHE_TTL.sessions;
  if (/^\/sessions\/[^/]+\/flights$/.test(apiPath)) return CACHE_TTL.flights;
  if (/^\/sessions\/[^/]+\/flights\/[^/]+\/flightplan$/.test(apiPath)) return CACHE_TTL.flightPlans;
  if (apiPath === "/aircraft" || apiPath.startsWith("/aircraft/")) return CACHE_TTL.aircraft;
  return 0;
}

function getCachedResponse(cacheKey, ttl) {
  if (ttl <= 0) return null;
  const cached = responseCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > ttl) {
    responseCache.delete(cacheKey);
    return null;
  }
  return cached;
}

async function loadEnvFile(path) {
  try {
    const content = await readFile(path, "utf8");
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const separator = trimmed.indexOf("=");
      if (separator === -1) return;

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const fullPath = join(root, safePath);

  if (!fullPath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(fullPath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(fullPath)] || "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}
