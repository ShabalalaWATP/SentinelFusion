# Security Model

## Trust Boundaries

- Browser: untrusted. It receives only normalised vessel data from our backend.
- API: trusted boundary for AISstream credentials, OpenAI credentials, validation, and rate limiting.
- AISstream.io: external data source used only from the API in live mode.
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
- `/analysis` validates input with Zod and can be guarded with `ANALYSIS_API_TOKEN`.
- OpenAI prompts are grounded in server-side repository snapshots and analytics.
- OpenAI instructions explicitly treat AIS text fields as untrusted telemetry.
- `/analysis` drops client-supplied vessel and aircraft intel for entities absent from the server snapshot.
- Client-supplied cached web-intel context is labelled as untrusted secondary context before reaching OpenAI. It is not treated as verified server telemetry.

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
