# Multiplayer server

Presence + WebRTC signaling + fallback relay for the 3D world. No game state:
see the header of `server.mjs` for what it does and doesn't do.

## Local

```bash
npm run dev:multiplayer   # from the repo root, listens on :8787
npm run dev               # the site; in dev it connects to ws://<host>:8787
```

Open the world in two windows to see each other.

## Deploy (Cloud Run)

Rooms live in memory, so this must run as a single instance.

```bash
gcloud run deploy portfolio-multiplayer \
  --source multiplayer-server \
  --region us-west1 \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 1 \
  --concurrency 1000 \
  --timeout 3600 \
  --set-env-vars ALLOWED_ORIGINS=https://nicolebelovoskey.com,https://www.nicolebelovoskey.com
```

Then set `VITE_MULTIPLAYER_URL=wss://<service-url>` in Netlify's environment
and redeploy the site. Without that variable, production stays single-player.

Cloud Run ends WebSocket connections at `--timeout` (max 60 min); clients
reconnect on their own.

| Env var | Default | |
|---|---|---|
| `PORT` | `8787` (`8080` in the Docker image) | |
| `ALLOWED_ORIGINS` | the two nicolebelovoskey.com origins | comma-separated; localhost is always allowed |
| `ALLOW_NETLIFY_PREVIEWS` | `true` | also allow `https://*.netlify.app` |
