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

This app must be deployed as a Node web service because `/ifapi` keeps the Infinite Flight API key server-side. Do not deploy it as a static-only site.

Recommended hosts:

- Render
- Railway
- Fly.io
- VPS

Deploy steps:

1. Push this folder to a GitHub repository.
2. Create a Node web service on Render or Railway.
3. Set this environment variable:

```sh
INFINITE_FLIGHT_API_KEY=your_api_key_here
```

4. Use these commands:

```sh
Build command: npm install
Start command: npm start
```

Use `/healthz` as the health check path if your host asks for one.

The server uses `process.env.PORT`, so it works with hosts that assign a port automatically.

## Cache Behavior

The proxy caches successful Infinite Flight responses:

- Sessions: 10 minutes
- Live flights: 15 seconds
- Aircraft reference endpoints: 24 hours

The cache is in-memory inside the long-running Node process. It resets when the service restarts, which is fine for Render/Railway-style hosting.
