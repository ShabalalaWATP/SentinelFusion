# AIS Intelligence Dashboard

Proof of concept for a dark-mode maritime and aviation intelligence dashboard. Stages 0 to 4 are in progress: a pnpm monorepo, typed shared schemas, Fastify AIS ingestion in mock/replay/live modes, mock and live-provider aircraft ingestion, a React/Vite MapLibre dashboard, and a backend OpenAI analysis endpoint.

## Scope

- Stage 0: repository structure, scripts, docs, Docker Compose skeleton, `.env.example` files, shared TypeScript types, and Zod schemas.
- Stage 1: React dashboard shell, MapLibre map, mock vessel stream over WebSockets, health API, style and projection controls, metrics, vessel drawer, and basic tests.
- Stage 2: server-side AISstream WebSocket client, replay fixtures, subscription filters, reconnect backoff, heartbeat handling, defensive parsing, and stream telemetry.
- Stage 3: guarded `/analysis` endpoint, deterministic mock analysis, OpenAI Responses API integration, server-side grounding, structured output, and frontend drawer workflow.
- Stage 4: aircraft contracts, `/aircraft`, `/flight/status`, `/ws/aircraft`, mock aircraft stream, OpenSky/ADS-B Exchange live adapters, aircraft map layer, aircraft details, aircraft web intel, search, and sea/air domain filtering.
- Stage 4.5: aircraft operations filters for search, classification presets, emergency, airborne, altitude, and speed, applied consistently across the map, aircraft list, routes, alerts, and military intel.

## Requirements

- Node.js 22 or later
- pnpm 10 via Corepack

```powershell
corepack enable
corepack prepare pnpm@10.12.1 --activate
pnpm install
pnpm dev
```

The web app runs on `http://localhost:5173` and the API runs on `http://localhost:4000`.

## Useful Commands

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

## Environment

Copy the example files before local customisation:

- `.env.example`
- `apps/api/.env.example`
- `apps/web/.env.example`

The app is live-first. On normal startup the API expects live AISstream ingestion and live OpenAI analysis:

- `AISSTREAM_API_KEY` is required for default startup.
- `AISSTREAM_BBOXES` defaults to `[[[-90,-180],[90,180]]]` for a worldwide AISstream subscription.
- `OPENAI_API_KEY` is required for default startup.
- `FLIGHT_MODE=live` and `FLIGHT_PROVIDER=opensky` are the default aircraft settings. OpenSky can rate-limit public polling, in which case the app reports the live provider error rather than falling back to mock data. Set `FLIGHT_PROVIDER=adsbexchange` plus `FLIGHT_API_KEY` for ADS-B Exchange.
- `FLIGHT_POLL_INTERVAL_MS` defaults to `90000` for OpenSky because a worldwide `/states/all` request consumes provider credits. The OpenSky client also honours provider retry-after headers when credits are exhausted.
- Flight provider keys are API-only. Do not put `FLIGHT_API_KEY` or OpenSky secrets in `apps/web/.env` or any `VITE_` variable.
- `FLIGHT_ROUTE_CONTEXT_MODE=off` is the default for filed-route enrichment because planned route, schedule, and flight-plan data needs a licensed provider. `mock` is available for offline UI development and is labelled as mock.
- `SANCTIONS_CONTEXT_MODE=off` is the default for sanctions and ownership screening because live screening needs a licensed server-side provider. `mock` is available for offline UI development and is labelled as mock.
- `SATELLITE_CONTEXT_MODE=live` uses public NASA GIBS WMS imagery through API-built fixed-host snapshot URLs. `off` and explicit `mock` modes remain available for deployment control and offline UI development.
- `AIRPORT_CONTEXT_MODE=live` uses public OurAirports airport/runway CSV data through the API. It needs no browser key and no `VITE_` variable.
- `AIRSPACE_CONTEXT_MODE=off` is the default because live NOTAM/TFR and restricted-airspace access needs an authorised or licensed provider. `mock` is available for offline UI development and is labelled as mock.
- `CONFLICT_CONTEXT_MODE=live` uses ACLED when API-side `ACLED_ACCESS_TOKEN` or `ACLED_USERNAME` and `ACLED_PASSWORD` are configured. Without ACLED access the app returns a clear provider-not-configured state. If ACLED credentials are configured, API startup also requires `ANALYSIS_API_TOKEN` so unauthenticated callers cannot spend provider credentials. ACLED credentials are API-only and must never use a `VITE_` prefix.
- `MARINE_WEATHER_MODE=live` uses Open-Meteo through the API. `FIRMS_MODE=live` requires `FIRMS_MAP_KEY` on the API server only.
- `ANALYSIS_API_TOKEN` is required for live analysis unless `ALLOW_UNAUTHENTICATED_ANALYSIS=true` is set for local development. If a token is set, `/analysis`, vessel intel enrichment, aircraft intel enrichment, vessel sanctions screening, and conflict/protest context require `Authorization: Bearer <token>` or `x-analysis-token`. Do not put this token in a `VITE_` variable.
- The web Settings panel has a session-only protected API token field. Paste the same `ANALYSIS_API_TOKEN` there when using protected AI, web-intel, sanctions, or ACLED conflict/protest routes from the browser.
- `ALLOW_UNAUTHENTICATED_ANALYSIS=true` is for local loopback development only. Production live analysis always requires `ANALYSIS_API_TOKEN`.
- `TRUST_PROXY` defaults to `false`. Use a hop count such as `1` or trusted proxy addresses/CIDRs only when the API is behind a reverse proxy that overwrites forwarded client headers. Blanket `TRUST_PROXY=true` is rejected.

The browser must never receive AISstream or OpenAI secrets.

Docker Compose binds the API and web ports to `127.0.0.1` on the host for local development, pins the Node base image by digest, and enables the local unauthenticated-analysis override. Do not reuse the Compose file as a public production deployment surface.

Mock and replay modes remain available only as explicit offline development overrides:

- `AIS_MODE=mock` uses synthetic vessel updates.
- `AIS_MODE=replay` uses recorded AISstream-style fixture messages.
- `FLIGHT_MODE=mock` uses synthetic aircraft updates.
- `ANALYSIS_MODE=mock` uses deterministic local analysis.

## Security Defaults

- AISstream is server-side only, including live mode.
- The frontend connects only to the backend API and WebSocket.
- Backend CORS and WebSocket origins are allow-listed.
- Environment variables are validated with Zod.
- API rate limiting is enabled and does not trust spoofable proxy headers by default.
- Logs redact sensitive headers and known secret names.
- AIS fields and analysis output are rendered as text, never raw HTML.
- OpenAI analysis is grounded in server-side repository snapshots and analytics, not browser-provided vessel claims.

See `docs/SECURITY_MODEL.md` for the full model.

## Flight Tracking Expansion

The aviation expansion is tracked in `docs/MASTER_IMPLEMENTATION_PLAN.md`. Implemented pieces include aircraft streaming contracts, mock aircraft, OpenSky and ADS-B Exchange live adapters, aircraft map rendering, aircraft details, aircraft web intel, aircraft search, aircraft operations filters, sea/air map filtering, aircraft-aware area analysis, combined sea/air military intel, and API-owned OSINT context for marine weather, active fire, airports/runways, airspace notice provider status, filed-route provider status, vessel sanctions/ownership screening provider status, NASA GIBS satellite snapshots, and ACLED-backed conflict/protest area context. Credentialed enrichment providers for filed routes, airspace notices, sanctions, and higher-resolution imagery remain planned.

## Agentic Upgrade Framework

Broad product-improvement work is coordinated through `docs/agents/AGENTIC_UPGRADE_FRAMEWORK.md`. When Alex asks for the Orchestrator Agent or an agentic upgrade loop, Codex should use that framework to coordinate research, API review, engineering, coding, quality, architecture, UX, security, documentation, and measurable goal-loop roles.
