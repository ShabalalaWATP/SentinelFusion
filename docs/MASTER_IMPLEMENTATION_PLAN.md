# Master Implementation Plan

## Objective

Extend Sentinel Fusion from an AIS-only maritime intelligence dashboard into a combined maritime and aviation live-tracking dashboard. The user should be able to see ships and aircraft on the same map, hide or isolate either domain, inspect aircraft with the same confidence and depth as vessels, identify military aircraft automatically where the data supports it, run AI and web intelligence workflows, and analyse drawn or named areas without the interface becoming visually noisy.

## Implementation Status

Implemented:

- Shared aircraft schemas, stream envelopes, metrics, and classification helpers.
- API aircraft repository, analytics service, `/aircraft`, `/flight/status`, and `/ws/aircraft`.
- Mock aircraft stream with commercial, military, government and emergency examples.
- OpenSky and ADS-B Exchange live polling adapters with provider response validation, request timeouts, bbox support, track retention and server-side credential handling.
- Frontend aircraft store, flight WebSocket client, aircraft map source/layers, realistic plane icon atlas, selected-aircraft halo, aircraft observed tracks, aircraft details, aircraft search, and `All / Ships / Aircraft` domain filtering.
- Aircraft web-intel enrichment for selected aircraft, including server-side OpenAI web search, image/source URL safety validation, deterministic mock mode, protected API route, and cached aircraft intel in AI analysis context.
- Automatic queued web-intel research for military/government aircraft only, to avoid spending requests on routine commercial traffic.
- Aircraft-aware drawn and named-area analysis with aircraft counts, military/emergency aircraft counts, and matching aircraft listed below the result.
- Aircraft operations filters for search, military/government/commercial presets, emergency, airborne, altitude and speed ranges, shared across map rendering, aircraft list, route panel, alerts, and military intel.
- Combined sea/air military intel panel with aircraft focus and aircraft web-intel actions.
- Feed confidence filters for stale contacts and unhealthy providers, including selected-contact preservation and persisted settings.
- Alert presets for high-risk vessels, classified vessels, emergency aircraft, classified aircraft, watched areas, anomalies, provider health and stale contacts.
- Settings panel for sea and air provider status, feed confidence controls, last message age, latency, errors and reconnect counts without exposing credentials.
- Server-side Open-Meteo marine weather context for analysed areas, with shared typed contracts, bounded cache, `ok`/`not_configured`/`error` states, and a collapsible area-result panel.
- Server-side NASA FIRMS active-fire context for analysed areas, with `FIRMS_MAP_KEY` held in the API, strict bounds validation, antimeridian-aware provider requests, capped detections, `ok`/`not_configured`/`error` states, and a toggleable fire-points map overlay.
- Server-side OurAirports airport/runway context for analysed areas and selected aircraft, with fixed open-data CSV URLs, bounded parsing, server-resolved selected-aircraft position lookups, typed `ok`/`not_configured`/`error` states, and collapsible area/aircraft panels.
- Server-side NOTAM/TFR airspace provider contract for analysed areas, with strict bounds validation, explicit off/mock/live modes, typed `ok`/`not_configured`/`error` states, and a collapsible area-result panel that does not claim live airspace notices without authorised provider access.
- Docker Compose and env examples for flight settings without exposing provider secrets to browser code.

Still planned:

- Optional filed-route enrichment where licensed provider data supports it.
- Credentialed airspace notice adapters when authorised FAA/SWIM or licensed provider access is available.
- Server-side provider aggregation for future OSINT providers and persisted domain defaults.

## Provider Decision

Use a provider adapter boundary and make ADS-B Exchange the preferred production flight-position source.

Rationale:

- ADS-B Exchange is the best fit for the military-aircraft requirement because its product positioning is independent, real-time ADS-B data with filtering by hex, callsign, squawk, location and other aircraft fields.
- OpenSky is useful as a development and fallback adapter, but its official documentation says it is for research and non-commercial purposes and does not provide commercial flight data such as schedules or delays.
- Flightradar24 and FlightAware are better as optional enrichment providers for commercial route, airport, airline, aircraft and historical context rather than the core military-aware live feed.
- Never scrape a consumer flight-radar website. Use licensed API access only.

References:

- OpenSky live API and state-vector documentation: https://openskynetwork.github.io/opensky-api/
- OpenSky REST state-vector fields and bounding-box query: https://openskynetwork.github.io/opensky-api/rest.html
- ADS-B Exchange aircraft API documentation: https://www.adsbexchange.com/api/aircraft/v2/docs
- Flightradar24 API documentation: https://fr24api.flightradar24.com/docs/getting-started
- FlightAware AeroAPI documentation: https://www.flightaware.com/aeroapi/portal/documentation

## Product Shape

The first screen stays a live operations dashboard, not a landing page.

Default view:

- Combined sea and air picture.
- Top metrics show two compact groups: Maritime and Aviation.
- Map symbols are visually distinct: realistic ship silhouettes and plane silhouettes.
- Low zoom should avoid clutter by emphasising selected, alerting, military, and high-risk items.
- Right drawer remains the detail and analysis work surface.

Core controls:

- Domain segmented control: `All`, `Ships`, `Aircraft`.
- Filter drawer section with compact toggles and chips:
  - Military only
  - Government only
  - Emergency/squawk only
  - In motion only
  - Altitude bands
  - Speed bands
  - Callsign/registration/hex text search
  - Provider/source status
- Route mode should clearly distinguish `Observed track` from `Filed route`.

Avoid overwhelming the user:

- Never show every possible field on cards. Use a concise summary row and expandable detail groups.
- Use progressive disclosure: map symbol, side-list row, selected detail, then web intel.
- Keep noisy technical provider fields out of primary UI unless they explain confidence or limitations.
- Show stale data age and source limitations plainly.
- At low zoom, make non-selected civilian aircraft quieter than military/emergency aircraft.

## Architecture

Keep the current monorepo and add aviation modules beside, not inside, the vessel modules.

Backend additions:

- `apps/api/src/flights/`
  - `IFlightTrackingClient`
  - `FlightStreamStatusTracker`
  - `AdsbExchangeFlightClient`
  - `OpenSkyFlightClient`
  - `MockFlightTrackingClient`
  - `FlightMessageNormaliser`
  - `AircraftRepository`
  - `AircraftAnalyticsService`
- `apps/api/src/intel/`
  - `OpenAiAircraftIntelService`
  - `MockAircraftIntelService`
- `apps/api/src/routes/aircraft.ts`
- `apps/api/src/ws/aircraft-stream.ts`

Shared additions:

- `Aircraft`
- `AircraftTrackPoint`
- `AircraftMetrics`
- `FlightStreamStatus`
- `AircraftSnapshotResponse`
- `AircraftStreamEnvelope`
- `AircraftIntelResponse`
- `AnalysisAircraftIntelContext`
- `AircraftClassification`

Frontend additions:

- `aircraftStore`
- `aircraftIntelStore`
- `flightRealtimeClient`
- `AircraftDrawer` or a unified `EntityDrawer`
- `aircraftMapData`
- `aircraftLayers`
- `aircraftIcons`
- `TrackFilterPanel`

Integration boundary:

- Keep separate repositories, analytics, clients and WebSockets at first.
- Add shared map abstractions for `MapDomainFilter` and `TrackedEntitySelection` only when duplicated logic becomes real.
- Do not merge aircraft and vessel types prematurely. The domains have different units, stale-data rules and route semantics.

## Environment

Add API-only variables:

```text
FLIGHT_MODE=live
FLIGHT_PROVIDER=adsbexchange
FLIGHT_API_BASE_URL=
FLIGHT_API_KEY=
FLIGHT_BBOXES=[[[-90,-180],[90,180]]]
FLIGHT_POLL_INTERVAL_MS=90000
FLIGHT_STALE_AFTER_SECONDS=60
FLIGHT_PROVIDER_TIMEOUT_MS=10000
OPEN_SKY_CLIENT_ID=
OPEN_SKY_CLIENT_SECRET=
MARINE_WEATHER_MODE=live
MARINE_WEATHER_TIMEOUT_MS=10000
MARINE_WEATHER_CACHE_SECONDS=900
MARINE_WEATHER_CACHE_MAX_ENTRIES=200
```

Rules:

- No flight provider secret may use a `VITE_` prefix.
- Live flight mode fails fast unless the selected provider has the required credentials.
- Mock and replay remain explicit offline overrides.
- Logs redact `FLIGHT_API_KEY`, `OPEN_SKY_CLIENT_SECRET`, and any provider-specific secret names.

Frontend variables:

```text
VITE_FLIGHT_WS_URL=ws://localhost:4000/ws/aircraft
```

This is public endpoint configuration only, not a secret.

## Data Model

Minimum aircraft fields:

- `id`: internal stable id, normally `icao24-{hex}`.
- `icao24`: ICAO 24-bit hex.
- `callsign`
- `registration`
- `aircraftType`
- `operator`
- `originCountry`
- `originAirport`
- `destinationAirport`
- `longitude`
- `latitude`
- `altitudeFt`
- `geoAltitudeFt`
- `groundSpeedKt`
- `trackDegrees`
- `verticalRateFpm`
- `squawk`
- `emergency`
- `onGround`
- `category`
- `classification`: `military`, `government`, `commercial`, `private`, `unknown`
- `riskLevel`: shared `low`, `medium`, `high`
- `lastUpdated`
- `track`
- `source`

Classification sources:

- Provider flags where available.
- ADS-B category and aircraft type.
- Callsign/operator prefixes for known military/government patterns.
- Squawk/emergency indicators.
- Web-intel enrichment can improve confidence but must not silently overwrite live provider facts.

## Backend Milestones

### Stage 4.1: Contracts And Mock Flight Stream

Deliverables:

- Shared aircraft schemas and types.
- Mock flight tracking client with deterministic global sample traffic.
- Aircraft repository and analytics service.
- `GET /aircraft`.
- `GET /flight/status`.
- `WS /ws/aircraft`.
- Tests for schema validation, no secret leakage, websocket origin rejection and stream updates.

Acceptance:

- App can run with `FLIGHT_MODE=mock` and show aircraft without provider keys.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass.

### Stage 4.2: Production Provider Adapter

Deliverables:

- ADS-B Exchange adapter.
- Provider request timeout and error handling.
- Poll scheduling with backoff and stale-aircraft pruning.
- Bounding-box support for whole globe and drawn/named areas.
- Secret redaction.

Acceptance:

- With a valid provider key, aircraft are live from startup.
- With missing keys, live mode fails fast with a clear config error.
- Provider secrets are absent from browser bundles, logs and status responses.

### Stage 4.3: Frontend Map Layer

Deliverables:

- Plane symbol atlas.
- Aircraft point layer and selected-aircraft halo.
- Observed track layer.
- Domain filter control: `All`, `Ships`, `Aircraft`.
- Aircraft list and selection.
- Map click selects aircraft, highlights it and zooms tightly.

Acceptance:

- Switching filters does not reload the map or flicker.
- Aircraft and vessel symbols remain visually distinct at desktop and mobile sizes.
- Selection is obvious on the map and in the drawer.

### Stage 4.4: Aircraft Detail Drawer

Deliverables:

- Aircraft summary card.
- Detail grid for callsign, ICAO hex, type, altitude, speed, vertical rate, squawk, origin/destination and update age.
- Web-intel panel for selected aircraft.
- Refreshable AI web search using server-side OpenAI tools.
- Image and source URL safety checks equivalent to vessel intel.

Acceptance:

- User can click an aircraft and understand what it is without opening raw provider data.
- Web intel uses public sources and records limitations.
- Unsafe URLs are rejected.

### Stage 4.5: Filters, Search And Alerting

Deliverables:

- Search by callsign, registration, ICAO hex, operator and type. Implemented.
- Filter chips with visible active count and reset button. Implemented for aircraft.
- Military/government/emergency presets. Implemented for aircraft, with commercial and airborne presets.
- Altitude and speed range inputs. Implemented for aircraft.
- Alert list includes emergency squawks, military aircraft, rapid descent, stale data and proximity to drawn area.
- Alert preset controls are persisted locally and can suppress noisy alert classes without removing the underlying detection code.
- Stale-contact and provider-health alert classes are available from the feed confidence foundation.

Acceptance:

- User can isolate only planes. Implemented.
- User can isolate only military planes. Implemented.
- User can return to combined view in one action. Implemented through the top domain switch.
- Empty states are clear and non-alarming. Implemented for filtered aircraft list and panels.

### Stage 4.6: AI Area Analysis

Deliverables:

- Analysis request supports `aircraft`, `selectedAircraft`, `areaAircraft` and `aircraftIntel`.
- Drawn box analysis works for ships, aircraft or both depending on active filter.
- Named area analysis resolves aircraft over the area.
- Result lists matching aircraft below the answer.
- Temporary area box remains visible and pans/zooms user to the area.

Acceptance:

- "How many aircraft are over Portsmouth?" gives a count and list.
- "Show military aircraft in this box" filters and explains matches.
- The response never exposes internal names such as `areaFocus` or `aircraftCount`.

### Stage 4.7: Combined Operations Polish

Deliverables:

- Combined metrics bar.
- Routes panel supports vessel and aircraft observed tracks. Implemented with observed AIS/flight wording, shared map/panel filtering, selected-track emphasis, route caps with selected-entity preservation, and start/latest map markers.
- Military intel panel supports sea and air. Implemented.
- Settings panel for data-provider status and feed confidence controls. Implemented for sea and air feeds.
- Domain defaults.
- Mobile layout preserves controls without covering the map.

Acceptance:

- New users can understand sea versus air tracks within 10 seconds.
- Power users can filter quickly without opening multiple drawers.
- No persistent panel takes over half the map unless explicitly opened.

## Security And Privacy

- Flight provider credentials are server-side only.
- `VITE_` variables stay public endpoint configuration only.
- All provider responses are schema-validated before storage.
- Provider text, callsigns, registrations and web-intel results render as text, never HTML.
- External image/source URLs are restricted to `http` and `https`.
- AI prompts treat ADS-B fields as untrusted telemetry.
- Rate limits apply to AI and web-intel endpoints.
- API status endpoints expose provider mode, health and data age, not credentials.
- Document public telemetry posture for `/aircraft` and `/ws/aircraft`.

## Testing Strategy

Shared:

- Aircraft schema happy path and invalid coordinate/hex cases.
- Aircraft stream envelope validation.
- Classification tests for military/government indicators.

API:

- Mock flight ingestion.
- Provider normalisation fixtures.
- Missing live credentials fail fast.
- Secret-free flight status.
- WebSocket origin rejection.
- Stale aircraft pruning.

Web:

- Aircraft store snapshot/update behaviour.
- Map data conversion.
- Filter state and active counts.
- Detail drawer rendering.
- Unsafe URL rejection in aircraft intel.
- Browser smoke tests across combined, ships-only and aircraft-only views.

## Completion Criteria

The flight-tracking expansion is complete only when:

- Live aircraft appear from startup with provider credentials configured.
- Mock flight mode works without provider credentials.
- Aircraft can be shown, hidden and filtered independently from vessels.
- Military aircraft are automatically flagged where data supports it.
- Aircraft selection highlights and zooms on the map.
- Aircraft details and web-intel workflows are available.
- Drawn-area and named-area AI analysis work for aircraft and combined sea/air traffic.
- Provider secrets are not exposed to the browser, API responses, logs, docs examples or screenshots.
- Required checks pass:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

## Current Next Step

Implement the next OSINT provider slice: filed-route enrichment provider contract with a not-configured state until licensed provider access is available. Domain defaults and mobile layout checks remain as Stage 4.7 polish.
