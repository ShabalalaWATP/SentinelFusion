# Security Model

## Trust Boundaries

- Browser: untrusted. It receives only normalised vessel data from our backend.
- API: trusted boundary for AISstream credentials, OpenAI credentials, validation, and rate limiting.
- AISstream.io: external data source used only from the API in live mode.
- Open-Meteo Marine Weather API: external no-key OSINT context source used only from the API.
- NASA FIRMS Area API: external active-fire OSINT source used only from the API with `FIRMS_MAP_KEY` kept server-side.
- OurAirports data: external public-domain airport/runway CSV source used only from the API.
- Airspace notice providers: future authorised FAA/SWIM, TFR, or licensed NOTAM/restriction feeds used only from the API. No consumer NOTAM or flight-radar pages are scraped.
- Filed-route providers: future licensed FlightAware AeroAPI, Flightradar24 API, or equivalent planned-route feeds used only from the API. No consumer flight-radar pages are scraped.
- Sanctions and ownership screening providers: future licensed OpenSanctions or custom screening feeds used only from the API. AIS vessel names, callsigns, and destinations are weak search hints, not verified identity.
- OpenAI API: external analysis provider used only from the API in live analysis mode.

## Implemented Controls

- `.env.example` files list variable names only.
- `AISSTREAM_API_KEY` and `OPENAI_API_KEY` are API-only environment variables.
- Default startup uses live AISstream and live OpenAI analysis.
- Startup fails fast unless `AISSTREAM_API_KEY` and `OPENAI_API_KEY` are configured.
- Frontend environment variables use only `VITE_API_BASE_URL` and `VITE_WS_URL`.
- Backend environment is validated with Zod before startup.
- Live analysis fails startup unless `ANALYSIS_API_TOKEN` is configured or `ALLOW_UNAUTHENTICATED_ANALYSIS=true` is explicitly set for local development.
- Production live analysis always fails startup unless `ANALYSIS_API_TOKEN` is configured.
- CORS is restricted to `CORS_ORIGINS`.
- WebSocket connections validate the `Origin` header against the same allow-list.
- API rate limiting is enabled, proxy header trust is disabled by default, and blanket `TRUST_PROXY=true` is rejected.
- Docker Compose publishes development ports on host loopback only.
- Docker Compose pins the Node base image by digest.
- Pino logging redacts authorisation, cookie, AISstream key, and OpenAI key fields.
- AIS vessel text is rendered as React text content, not raw HTML.
- Analysis output is rendered as React text content, not raw HTML.
- Public web-intel URLs are restricted to `http` and `https` before they can be rendered as links or image sources.
- Shared Zod schemas validate API and WebSocket payloads.
- AISstream parser accepts only usable, schema-valid vessel updates and records dropped frames.
- `/stream/status` exposes telemetry without credentials.
- `/vessels` and `/ws/vessels` expose public normalised AIS telemetry in this POC. The WebSocket `Origin` check is browser-origin hygiene, not an authentication control.
- `/analysis` and API-side enrichment routes validate input with Zod and can be guarded with `ANALYSIS_API_TOKEN`.
- OpenAI prompts are grounded in server-side repository snapshots and analytics.
- OpenAI instructions explicitly treat AIS text fields as untrusted telemetry.
- `/analysis` drops client-supplied vessel and aircraft intel for entities absent from the server snapshot.
- Client-supplied cached web-intel context is labelled as untrusted secondary context before reaching OpenAI. It is not treated as verified server telemetry.
- `/context/marine-weather` accepts only validated area bounds, builds requests to a fixed Open-Meteo marine host, validates provider JSON with Zod, normalises timestamps, uses timeout and bounded cache controls, and returns typed provider states without exposing provider request URLs or credentials.
- `/context/fire-anomalies` accepts only validated area bounds, builds requests to the fixed NASA FIRMS host, keeps `FIRMS_MAP_KEY` server-side, splits antimeridian boxes into valid provider requests, parses CSV into typed/capped detections, uses timeout and bounded cache controls, and returns typed provider states without exposing provider request URLs or credentials.
- `/context/airports` accepts only validated area bounds or numeric point lookups, builds requests to fixed OurAirports CSV URLs, caps provider response bytes while streaming and CSV rows before parsing, and returns typed airport/runway summaries. `/aircraft/:id/airport-context` resolves selected-aircraft coordinates from the server repository instead of trusting browser-supplied aircraft positions.
- `/context/airspace` accepts only validated area bounds, rejects over-large areas before any provider access, and returns a typed not-configured state by default. Mock notices are available only through explicit API-side configuration and are labelled as mock. The current live mode does not make outbound airspace-notice requests until an authorised provider adapter is added.
- `/aircraft/:id/filed-route` resolves selected aircraft from the server repository, returns typed provider states, and defaults to not configured until a licensed filed-route provider adapter is added. The browser supplies only an aircraft id, not callsign, route text, provider URLs, or credentials.
- `/vessels/:id/sanctions-screening` uses the same optional `ANALYSIS_API_TOKEN` guard as enrichment routes, resolves selected vessels from the server repository, returns typed provider states, and defaults to not configured until a licensed sanctions or ownership provider adapter is added. The browser supplies only a vessel id, not vessel identity claims, provider URLs, or credentials. Mock matches require explicit API-side configuration and are labelled as review leads.

## AISstream Risks

- AISstream reconnect storms.
- Malformed AIS messages.
- Sensitive credential exposure through frontend bundles or logs.
- Excessive message volume creating denial-of-service pressure.

Mitigations implemented: reconnect backoff, heartbeat pinging, server-side subscription filters, schema validation, fixture tests, secret-free status telemetry, and log redaction paths. This POC still uses an in-memory repository and does not implement durable queues or production autoscaling.

## Analysis Risks

- Prompt injection through vessel names, destinations, or other AIS text fields.
- Model hallucination presented as operational fact.
- Unbounded analysis costs.
- Overbroad data disclosure in prompts or logs.

Mitigations implemented: strict input and output schemas, server-side grounding, explicit limitations in responses, deterministic mock fallback, global rate limits, production token guard, explicit local unauthenticated-analysis override, localhost-only Compose exposure, and tests with hostile AIS text. Production cost controls should add per-user quotas and authenticated identities before public exposure.

Client-supplied cached web intel is accepted only for currently known server-side entities and is marked as untrusted secondary context. A future server-owned intel cache should replace browser-submitted cached intel entirely before public deployment.

## OSINT Provider Risks

- SSRF or arbitrary outbound requests through provider URL parameters.
- Provider outages or rate limits being presented as successful live context.
- Unbounded outbound provider calls from repeated area analysis.
- Modelled environmental or satellite-detection data being mistaken for navigational, emergency-response, or legal advice.

Mitigations implemented for marine weather: the browser can only submit numeric bounds, the API uses a fixed Open-Meteo marine endpoint, provider JSON is schema-validated, request timeout and bounded in-memory cache settings are enforced, provider unavailable/off states are rendered explicitly, and UI limitations state that the data is decision-support context rather than navigational advice.

Mitigations implemented for NASA FIRMS: the browser can only submit numeric bounds, the API uses a fixed NASA FIRMS endpoint, area/span limits reject over-large provider requests, provider cache keys are bucketed, in-flight provider requests are coalesced, provider response bytes and rows are capped before processing, the map key is never sent to browser code or API responses, provider CSV is normalised into a typed schema, detections are capped before rendering, request timeout and bounded in-memory cache settings are enforced, and UI limitations state that active-fire points are satellite thermal detections that can include false positives or missed fires.

Mitigations implemented for OurAirports: the API uses fixed `airports.csv` and `runways.csv` URLs, selected areas have area/span limits, selected-aircraft lookups are resolved from server aircraft state, provider response bytes are counted during streaming and the reader is cancelled once the cap is crossed, CSV rows are capped before processing, runway lists and returned airports are capped before rendering, request timeout and bounded cache settings are enforced, and UI limitations state that OurAirports is public-domain community data rather than authoritative aeronautical information.

Mitigations implemented for airspace notices: the browser can only submit numeric bounds, selected areas have airspace-specific span and area limits, no provider URL is accepted from the client, the default route returns an explicit not-configured response, mock output requires an explicit API-side mode, and UI text states that live NOTAM/TFR access needs authorised provider configuration. The implementation deliberately avoids scraping consumer NOTAM, TFR, or flight-radar pages.

Mitigations implemented for filed routes: the browser can request a selected aircraft by id only, the API resolves current aircraft identity from server state, no provider URL is accepted from the client, default and unimplemented live modes return explicit not-configured responses, mock output requires an explicit API-side mode, and UI text separates licensed filed/planned route data from observed tracks reconstructed from position updates.

Mitigations implemented for sanctions and ownership screening: the browser can request a selected vessel by id only, the API resolves vessel identity from server state, `ANALYSIS_API_TOKEN` protects screening when configured, unauthorised requests do not invoke the screening service, no provider URL is accepted from the client, default and unimplemented live modes return explicit not-configured responses, mock output requires an explicit API-side mode, match links are restricted to `http` and `https`, and UI text presents matches as review leads with confidence scores and false-positive warnings rather than compliance facts.
