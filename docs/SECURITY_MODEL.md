# Security Model

## Trust Boundaries

- Browser: untrusted. It receives only normalised vessel data from our backend.
- API: trusted boundary for AISstream credentials, OpenAI credentials, validation, and rate limiting.
- AISstream.io: external data source used only from the API in live mode.
- Open-Meteo Marine Weather API: external no-key OSINT context source used only from the API.
- NASA FIRMS Area API: external active-fire OSINT source used only from the API with `FIRMS_MAP_KEY` kept server-side.
- OurAirports data: external public-domain airport/runway CSV source used only from the API.
- NASA GIBS: external public satellite imagery source. The API constructs fixed-host WMS snapshot URLs for validated areas; no provider credentials are used or exposed.
- ACLED: external conflict and protest event source used only from the API when authorised credentials are configured. ACLED access tokens and username/password credentials remain server-side.
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
- `/analysis`, API-side enrichment routes, and credential-backed conflict/protest context validate input with Zod and can be guarded with `ANALYSIS_API_TOKEN`.
- OpenAI prompts are grounded in server-side repository snapshots and analytics.
- OpenAI instructions explicitly treat AIS text fields as untrusted telemetry.
- `/analysis` drops client-supplied vessel and aircraft intel for entities absent from the server snapshot.
- Client-supplied cached web-intel context is labelled as untrusted secondary context before reaching OpenAI. It is not treated as verified server telemetry.
- `/context/marine-weather` accepts only validated area bounds, builds requests to a fixed Open-Meteo marine host, validates provider JSON with Zod, normalises timestamps, uses timeout and bounded cache controls, and returns typed provider states without exposing provider request URLs or credentials.
- `/context/fire-anomalies` accepts only validated area bounds, builds requests to the fixed NASA FIRMS host, keeps `FIRMS_MAP_KEY` server-side, splits antimeridian boxes into valid provider requests, parses CSV into typed/capped detections, uses timeout and bounded cache controls, and returns typed provider states without exposing provider request URLs or credentials.
- `/context/airports` accepts only validated area bounds or numeric point lookups, builds requests to fixed OurAirports CSV URLs, caps provider response bytes while streaming and CSV rows before parsing, and returns typed airport/runway summaries. `/aircraft/:id/airport-context` resolves selected-aircraft coordinates from the server repository instead of trusting browser-supplied aircraft positions.
- `/context/satellite-snapshot` accepts only validated area bounds, rejects over-large or antimeridian-crossing areas before image URL construction, builds NASA GIBS URLs from a fixed host and server-side layer settings, returns typed provider states, and sends no provider credentials or browser-side configuration.
- `/context/conflict-events` uses the same optional `ANALYSIS_API_TOKEN` guard as enrichment routes, accepts only validated area bounds, rejects over-large areas before provider access, builds ACLED API and OAuth requests against a fixed host, keeps ACLED credentials server-side, caps provider rows and response bytes, filters events back to the selected bounds, and returns typed provider states without exposing provider request URLs or bearer tokens.

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

Mitigations implemented for satellite snapshots: the browser can only submit numeric bounds, selected areas have satellite-specific span and area limits, antimeridian-crossing WMS boxes are rejected for this first implementation, the API constructs image URLs against the fixed NASA GIBS host using server-side layer/date settings, image and source URLs are schema-validated as `http` or `https`, the UI revalidates URLs before rendering, and limitations state that browse imagery can be cloud-obscured, delayed, or unsuitable for navigation or authoritative intelligence.

Mitigations implemented for conflict and protest context: the browser can only submit numeric bounds, `ANALYSIS_API_TOKEN` protects provider-backed lookups when configured, unauthorised requests do not invoke the conflict provider service, selected areas have conflict-specific span and area limits, ACLED API and OAuth calls use a fixed server-side host, credentials and bearer tokens are never returned to the browser, OAuth tokens are cached server-side with expiry, provider response bytes and rows are capped before processing, antimeridian selections are split into valid provider requests, results are filtered back to the selected bounds, and UI copy presents conflict/protest events as reported OSINT leads with source, confidence, and false-negative limitations rather than confirmed operational truth.
