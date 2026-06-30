# CZVG Expert Live Map

A small browser app that shows matching live Infinite Flight Expert Server traffic on a Leaflet map.

## Match Rules

- Pilot virtual organization tag contains `CZVG`
- China Southern callsigns ending in `VG`, such as `CSN123VG`
- Any airline callsign ending in `CZ`, such as `UAL456CZ`

## Run Locally

Use the included local server when possible. It serves the site and proxies Infinite Flight API calls so browser CORS rules do not get in the way:

```sh
cp .env.example .env
```

Add your Infinite Flight API key to `.env`:

```sh
INFINITE_FLIGHT_API_KEY=your_api_key_here
```

Then start the site:

```sh
node server.mjs
```

Then visit `http://localhost:5173`.

You can also use npm:

```sh
npm start
```

Do not use VS Code Live Server for this app. Live Server may open `http://127.0.0.1:5500`, but it does not provide the `/ifapi` route that keeps your API key server-side.

The API key stays on the local server and is never sent to the browser.

## Deploy

Cloudflare Pages is the recommended host for this app. Static files are served from `public/`, and `/ifapi/*` is handled by a Cloudflare Pages Function so the Infinite Flight API key stays server-side.

### Cloudflare Pages

One-time setup:

1. Push this folder to a GitHub repository.
2. Create a Cloudflare Pages project connected to the repository.
3. Set the build output directory to `public`.
4. Leave the build command empty, or use:

```sh
npm run check
```

5. Add this Pages environment variable or secret:

```sh
INFINITE_FLIGHT_API_KEY=your_api_key_here
```

If you deploy with Wrangler instead of the dashboard:

```sh
npm run deploy:cloudflare
```

Cloudflare does not run a long-lived Node process for this app, so there is no Render-style free instance spin-down. The `/ifapi` proxy runs on demand at the edge.

### Other Hosts

You can still deploy this as a Node web service on Render, Railway, Fly.io, or a VPS with:

```sh
Build command: npm install
Start command: npm start
```

Use `/healthz` as the health check path if your host asks for one. The server uses `process.env.PORT`, so it works with hosts that assign a port automatically.

## Cache Behavior

The proxy caches successful Infinite Flight responses:

- Sessions: 10 minutes
- Live flights: 15 seconds
- Selected flight plans: 60 seconds
- Aircraft reference endpoints: 24 hours

Local Node hosting uses an in-memory cache inside the long-running Node process. Cloudflare hosting uses the Pages Function edge cache instead.
