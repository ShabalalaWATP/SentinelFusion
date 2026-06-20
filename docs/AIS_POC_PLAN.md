# AIS Intelligence Dashboard POC Plan

## Product Goal

Create a modern maritime intelligence dashboard that receives AIS data server-side, visualises vessels on a React map dashboard, and supports natural-language analysis through a backend OpenAI integration.

## Stage 0: Foundation

Status: implemented.

- Create pnpm monorepo with `apps/web`, `apps/api`, and `packages/shared`.
- Add root scripts for `dev`, `build`, `lint`, `typecheck`, and `test`.
- Add `.env.example` files.
- Add README, project guidance, architecture, security model, and POC plan docs.
- Add Docker Compose skeleton for local web and API services.
- Add shared TypeScript types and Zod schemas.

## Stage 1: Mock Dashboard

Status: implemented.

- Build dark React dashboard shell.
- Render MapLibre map view with mock vessel data.
- Add map style switcher for dark, light, streets, satellite, satellite hybrid, terrain, and outdoor styles.
- Add projection switcher for Mercator and globe where the active MapLibre runtime supports it.
- Render vessel markers and trails through GeoJSON/WebGL map layers.
- Add right-side vessel details drawer.
- Add top metrics bar.
- Add mock backend WebSocket stream with synthetic AIS vessel updates.
- Add API health route.
- Add basic API, shared schema, and frontend tests.

## Stage 2: Live AISstream Integration

Status: implemented.

- Implement `IAisStreamClient` with the AISstream.io WebSocket protocol.
- Keep `AISSTREAM_API_KEY` in `apps/api` only.
- Add subscription filters, reconnect backoff, heartbeat handling, and replay-safe message parsing.
- Add integration tests using recorded AIS fixtures, not live credentials.
- Extend operational telemetry for stream state, error rates, reconnects, and message latency.
- Expose secret-free stream status through `/stream/status` and `/vessels`.

## Stage 3: OpenAI Analysis Backend

Status: implemented.

- Implement `IAnalysisAgentService` with the official OpenAI SDK in `apps/api`.
- Keep `OPENAI_API_KEY` server-side only.
- Add guarded natural-language analysis endpoints with Zod input validation and rate limits.
- Ground analysis in repository snapshots and analytics summaries, not browser-provided vessel claims.
- Add prompt-injection resistance for AIS text fields and redact sensitive operational data from logs.
- Add tests for validation, authorisation hooks, rate limiting, and deterministic fallback behaviour.
- Wire the frontend vessel drawer to `/analysis` with loading, success, and error states.

## Success Criteria For Current POC

- The default app starts in live AISstream and live OpenAI analysis modes.
- Mock and replay modes remain available for explicit offline development.
- The web app receives synthetic vessel updates from the backend WebSocket.
- Map controls update visual style and projection state.
- Selecting a vessel opens and updates the details drawer.
- Type checking, linting, tests, and builds pass.
- Default startup requires `AISSTREAM_API_KEY`.
- Default startup requires `OPENAI_API_KEY`.
