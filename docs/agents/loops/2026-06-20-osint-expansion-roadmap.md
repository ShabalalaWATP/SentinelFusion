# Goal Loop State

## Loop ID

`2026-06-20-osint-expansion-roadmap`

## Orchestrator

Main Codex Orchestrator Agent

## Product Goal

Implement the selected Sentinel Fusion expansion set: feed confidence filters, provider status console, alert preset builder, marine weather, NASA FIRMS fire context, airport/runway enrichment, NOTAM/TFR airspace context, filed flight route enrichment, sanctions and ownership screening, satellite area snapshots, and conflict/protest overlays.

## User Value

Users should be able to trust feed freshness, understand provider limits, turn relevant alerts on and off, and enrich selected areas or entities with live OSINT context without losing the clean operations-dashboard workflow.

## Selected Features And Definitions Of Done

| # | Feature | Definition of done | Implementation approach |
| ---: | --- | --- | --- |
| 1 | Feed confidence filters | Users can filter or visually de-emphasise stale vessels, stale aircraft, unhealthy providers, and low-confidence sources. Stale thresholds are visible, tested, and affect map, route, alert, and list surfaces consistently. | Add shared feed-confidence selectors, frontend filter state, contact age helpers, UI chips, and alert integration. No new external provider required. |
| 2 | Provider status console | A Settings/Status panel shows sea, air, and OSINT provider mode, health, coverage bounds, last message, latency, retry/rate-limit state, and last error without credentials. | Reuse `/stream/status` and `/flight/status`, then add an aggregate provider-status client and drawer panel. |
| 3 | Alert preset builder | Users can enable/disable built-in alert presets such as military contact, emergency aircraft, stale contact, stopped vessel, fast vessel, area entry/exit, provider unhealthy, and OSINT hazard near area. Presets persist locally and do not create duplicate/dead alerts. | Extend `alertStore`, `alertModels`, and `AlertsPanel` with preset toggles and tests. Keep rule logic in alert/anomaly modules, not React components. |
| 6 | Marine weather layer | Drawn/named areas can fetch current marine conditions and forecast summaries, displayed in a collapsible OSINT panel and optionally on the map. Results include source, timestamp, limitations, and area bounds. | API-side Open-Meteo client first, with optional NOAA CO-OPS station enrichment later. Cache by provider grid point and full selected bounds, and never call providers from browser code. |
| 7 | NASA FIRMS fire and smoke impact | With a server-side `FIRMS_MAP_KEY`, selected areas can show recent active fire/thermal anomalies and a map layer. Without a key, the UI shows a clear not-configured state and no mock live claim. | API-side FIRMS area client, strict bounds/day limits, shared schemas, map source/layer, and analysis context. |
| 8 | Airport and runway enrichment | Aircraft and selected areas show nearest airports/runways with ident, name, type, elevation, runway headings and distance. Works offline from cached/open data without user keys. | Server-owned OurAirports dataset adapter or curated fixture first; expose readonly route and typed client. |
| 9 | NOTAM/TFR/airspace layer | When configured with a licensed/authorised provider, selected airport/area shows current notices and restrictions with validity windows. Without provider credentials, the app explains that NOTAM/TFR access is not configured. | Provider-adapter boundary only. Do not scrape consumer sites. Prefer FAA/authorised API access or commercial API. |
| 10 | Filed route enrichment | Selected aircraft can show filed/planned route, origin/destination, schedule, and provider confidence when licensed data is configured. Observed tracks remain labelled separately. | Add `IFlightRouteProvider` with FlightAware/FR24 adapters behind server env vars. No browser keys. |
| 11 | Sanctions and ownership screening | Selected vessels/operators can be screened with confidence scoring, source links, and false-positive warnings. Matches never silently become facts without evidence. | Start with OpenSanctions API/bulk boundary and server-owned cache. Treat AIS names as weak hints. |
| 14 | Satellite area snapshot | Selected area can display a recent satellite imagery snapshot or tile layer with date/source/limitations. If provider auth is missing, show not-configured state. | Start with NASA GIBS public WMTS/WMS imagery for low-secret baseline; Sentinel Hub can be added later behind OAuth. |
| 16 | Conflict and protest overlay | Selected areas can show recent conflict/protest/news events with source, event date, confidence/limitations, and map markers. Users can filter this layer off. | Trial with GDELT/UCDP public data first. ACLED requires account/API handling and should be provider-configured. |

## Acceptance Criteria

- [ ] Each selected feature has typed shared contracts or an explicit deferred-provider contract.
- [ ] Provider credentials, if needed, are server-side env vars only.
- [ ] Every provider-backed feature has `ok`, `not_configured`, and `error` states.
- [ ] Browser UI never claims mock or missing-provider data is live.
- [ ] Map overlays are capped, toggleable, and removable.
- [ ] Right drawer navigation remains: overview, routes, alerts, military, settings/status, and OSINT detail without crowding the map.
- [x] Alert presets can be toggled and persisted locally.
- [x] Feed confidence filters apply consistently to map, routes, alerts, and entity lists.
- [ ] Tests cover selectors, schemas, provider client parsing, not-configured states, and UI toggles.
- [ ] Static and dynamic security review runs after each coherent implementation slice.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass before declaring any slice complete.

## Agent Assignments

| Agent | Responsibility | Write scope | Status |
| --- | --- | --- | --- |
| Research Agent | Current API/provider docs and feature feasibility for all 11 items. | None | Complete |
| API Agent | Provider boundary, env vars, route/service sequencing, and not-configured contracts. | None | Complete |
| Software Engineering Agent | Architecture, module boundaries, SOLID plan, and phased implementation. | None | Complete |
| Data Quality and Feed Reliability Agent | Feed confidence, stale-contact, provider-limit, and status-honesty requirements. | None | Complete for foundation slice |
| Coding Agent | Implement one coherent slice at a time, starting with features 1, 2, and 3. | `apps/web/src`, shared schemas as needed | Foundation, marine, fire, airport, airspace-contract, and filed-route-contract slices implemented |
| Code Quality Agent | Review each implementation slice after code changes. | None | Manual review complete for filed-route contract slice |
| Code Architecture Agent | Check boundaries, file sizes, SOLID fit, and dead-code risk. | None | Manual review complete for filed-route contract slice |
| User Experience Agent | Verify rendered dashboard, panel navigation, layer filtering, and mobile fit. | None | Component/UI tests and browser smoke passed for filed-route contract slice |
| Performance and Map Scalability Agent | Check map overlay caps and source update cost. | None | In progress |
| Cyber Security Agent | Threat model now, formal static/dynamic review after each slice. | None | Manual review complete for filed-route contract slice |
| Documentation Agent | Keep plan, changelog, development story, security notes, and README current. | `docs`, `README.md` | Updated through filed-route contract slice |

## Stage Order

- [x] Discovery
- [x] Decision
- [x] Goal tool or loop-state initialised
- [x] Implementation: foundation slice, features 1, 2, and 3
- [x] Quality review: foundation slice
- [x] Security review: foundation slice
- [x] Browser verification: foundation slice
- [x] Implementation: OSINT provider foundation and first no-key provider
- [x] Implementation: NASA FIRMS active-fire provider slice
- [x] Implementation: OurAirports airport/runway provider slice
- [x] Implementation: NOTAM/TFR airspace provider-contract slice
- [x] Implementation: filed-route provider-contract slice
- [ ] Implementation: credentialed provider adapters
- [ ] Final verification
- [ ] Documentation
- [ ] Next-goal selection

## Decision Record

| Recommendation | Source agent | Impact | Risk | Effort | Confidence | Decision |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Implement features 1, 2, and 3 first as the trust/control foundation. | Orchestrator, implementation plan | 9 | 2 | 3 | 9 | Adopted |
| Use Open-Meteo for the first marine-weather implementation. | Research Agent, official docs | 8 | 3 | 4 | 8 | Adopted after foundation |
| Use NASA FIRMS only with server-side `FIRMS_MAP_KEY` and not-configured UI. | Research Agent, official docs | 8 | 4 | 5 | 8 | Adopted after provider foundation |
| Use OurAirports for low-risk airport/runway enrichment. | Research Agent, official docs | 7 | 2 | 4 | 8 | Adopted |
| Defer live NOTAM/TFR and filed-route enrichment until authorised provider credentials are available. | API Agent | 8 | 7 | 6 | 8 | Airspace and filed-route provider contracts implemented first |
| Treat sanctions matches as triage leads with confidence and false-positive warnings. | Cyber Security Agent | 8 | 6 | 6 | 8 | Adopt with safeguards |
| Start satellite snapshots with NASA GIBS before Sentinel Hub OAuth. | Research Agent | 7 | 4 | 5 | 7 | Trial |
| Start conflict/protest overlays with public GDELT/UCDP data, ACLED as configured provider. | Research Agent | 7 | 5 | 5 | 7 | Trial |

## Verification Gates

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm audit --prod`
- [x] Browser or UI verification
- [x] Static security review
- [ ] Dynamic local security review where practical
- [x] Docs updated

## Foundation Slice Evidence

Implemented on 2026-06-20:

- Feed-confidence settings store and selectors with stale-contact and unhealthy-feed filtering.
- Visible traffic selector integration so map, alerts and aircraft list consumers can hide stale or unhealthy contacts while preserving selected contacts where appropriate.
- Settings rail navigation and a provider status drawer showing sea and air feed mode, state, latency, messages, reconnects, last error, and explicit telemetry freshness without credentials.
- Alert preset definitions, persisted preset settings, preset controls in the alert centre, provider-health alerts, and optional stale-contact summary alerts with incident-scoped IDs.
- Regression tests for feed-confidence filtering, strict telemetry-based feed health, alert presets, incident-scoped provider alerts, alert store persistence, feed filter persistence, traffic visibility, and settings-panel controls.

Verification evidence:

- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed, shared 17 tests, API 52 tests, web 77 tests.
- `corepack pnpm build`: passed, with the existing Vite large chunk warning.
- `corepack pnpm audit --prod`: passed, no known production dependency vulnerabilities.
- In-app browser verification: Settings drawer rendered; AIS showed healthy with fresh telemetry, OpenSky showed degraded with no telemetry. Historical HMR console errors from earlier hot reload remained in the dev log capture but no new runtime failure was visible.
- Code quality review findings remediated: alert/list surfaces now consume filtered traffic, provider/stale alert IDs are incident-scoped, aircraft errors clear when the flight WebSocket reopens, stale-contact logic reuses one helper, and selector exports are used in UI.
- Cyber review findings remediated: provider health now requires open connection, subscribed stream state, received and normalised telemetry, no current error, and a fresh `lastMessageAt`; no-telemetry provider incidents now include a provider incident epoch that advances after recovery, so a dismissed cold-start outage cannot suppress a later one.
- Final focused cyber review result: no validated security issues remain for this foundation slice.

## Marine Weather Slice Evidence

Implemented on 2026-06-20:

- Shared `marineWeatherResponseSchema` and `MarineWeatherResponse` type with provider status, source attribution, analysed area, nearest grid point, current conditions, capped forecast, risk reasons, limitations, cache flag, and safe public URL validation.
- API-side `MarineWeatherService` using the fixed Open-Meteo marine endpoint, strict provider response parsing, WGS84 selected-area centre calculation with antimeridian handling, Unix timestamp normalisation, request timeout, bounded in-memory cache, and `ok`/`not_configured`/`error` result states.
- `GET /context/marine-weather` route with strict bounds validation and no browser-supplied provider URL.
- Web API client, `marineWeatherStore`, and collapsible `MarineWeatherPanel` inside area analysis results. The panel auto-refreshes live marine conditions for the analysed area and shows refresh, provider attribution, risk signal, current wave/swell/current/SST context, and clear not-configured/error messaging.
- Environment example variables for `MARINE_WEATHER_MODE`, timeout, cache TTL, and cache max entries. No `VITE_` provider config or secrets were added.

Verification evidence:

- Open-Meteo live sanity check returned HTTP 200 from `marine-api.open-meteo.com` with numeric current and hourly timestamps for the implemented query shape.
- `corepack pnpm --filter @aisstream/shared test`: passed, shared schema tests now 19 tests.
- `corepack pnpm --filter @aisstream/api test -- marine-weather-service marine-weather-route app`: passed, API suite reported 58 tests.
- `corepack pnpm --filter @aisstream/web test -- MarineWeatherPanel marineWeatherStore AnalysisResult`: passed, web suite reported 85 tests.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm lint`: passed.
- `corepack pnpm test`: passed, full suite reported 162 tests.
- `corepack pnpm build`: passed. Vite still reports the existing large JavaScript chunk warning.
- `corepack pnpm audit --prod`: passed, no known production dependency vulnerabilities.
- `git diff --check`: passed.
- Live local API smoke: `GET /context/marine-weather?south=50.68&west=-1.28&north=50.9&east=-0.86` returned `status:"ok"` with Open-Meteo source attribution.
- Browser plugin limitation: the in-app Browser could not attach to an active or new tab during this slice, and Playwright was not installed, so rendered verification used component tests plus local HTTP/API smoke checks.
- Code quality review findings remediated: cache keys now include the full selected bounds, overlapping frontend refreshes cannot render stale area results, oversized touched tests were split, and roadmap evidence was corrected.
- Focused cyber review result: no validated security issues remain for this marine weather slice. The provider uses a fixed server-side Open-Meteo URL, strict bounds validation, response parsing, request timeout, bounded cache, and no browser-exposed provider config.

## NASA FIRMS Slice Evidence

Implemented on 2026-06-21:

- Shared `fireContextResponseSchema` and `FireContextResponse` type with provider status, source attribution, analysed area, source dataset, day range, capped active-fire detections, summary counts, risk reasons, limitations, cache flag, and safe public URL validation.
- API-side `FireContextService` using the fixed NASA FIRMS Area API host, server-side `FIRMS_MAP_KEY`, strict selected-area bounds validation, fire-context-specific area/span limits, bucketed provider cache keys, in-flight provider request coalescing, antimeridian splitting, CSV byte and row caps, request timeout, bounded in-memory cache, capped detections, and `ok`/`not_configured`/`error` result states.
- `GET /context/fire-anomalies` route with strict bounds validation and no browser-supplied provider URL.
- Web API client, `fireContextStore`, collapsible `FireContextPanel`, `AreaContextStack`, and dynamic MapLibre fire-points overlay controlled by the existing intelligence-layer toggles and scoped to the current area-analysis result.
- Environment example variables for `FIRMS_MODE`, `FIRMS_MAP_KEY`, source, day range, timeout, cache TTL, cache max entries, and max detections. No `VITE_` provider config or secrets were added.

Verification evidence:

- `corepack pnpm --filter @aisstream/shared test`: passed, shared schema tests now 20 tests.
- `corepack pnpm --filter @aisstream/api test -- fire-context-service fire-context-route app`: passed after remediation, API targeted suite reported 70 tests.
- `corepack pnpm --filter @aisstream/web test -- FireContextPanel fireContextStore fireAnomalyOverlay useFireAnomalyData AnalysisResult mapStore`: passed after remediation, web targeted suite reported 96 tests.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm lint`: passed.
- `corepack pnpm test`: passed, full suite reported shared 20 tests, API 70 tests, and web 96 tests.
- `corepack pnpm build`: passed. Vite still reports the existing large JavaScript chunk warning.
- `corepack pnpm audit --prod`: passed, no known production dependency vulnerabilities.
- `git diff --check`: passed.
- Secret-pattern scan for OpenAI, AISstream, and FIRMS key assignments: no matches.
- File-size guard: touched FIRMS files remain within the 350-line preference; only the pre-existing alert files remain above the threshold.
- In-app Browser verification: app loaded at `http://localhost:5173/` with title `Sentinel Fusion`; DOM was nonblank, no framework overlay was detected, console errors/warnings were empty, and the Map controls panel exposed a unique `Fire points` toggle that changed `aria-pressed` from `false` to `true`. Browser screenshot capture timed out twice through the browser backend.
- Security review finding remediated: over-large unauthenticated FIRMS requests are rejected before provider access, provider cache keys are bucketed, in-flight requests are coalesced, provider response bytes and rows are capped, and CSV processing stops before unbounded parsing.
- Code quality review findings remediated: limits are wired into route/service, stale fire points are scoped to the current area-analysis result through `useFireAnomalyData`, and `FIRMS_MODE=off` has distinct disabled-mode remediation text.
- Focused cyber review result: no validated security issues remain for this FIRMS slice.

## Airport/Runway Slice Evidence

Implemented on 2026-06-21:

- Shared `airportContextResponseSchema` and `AirportContextResponse` type with provider status, source attribution, analysed area or selected-aircraft focus, capped airports, capped runway summaries, nearest-distance metrics, scheduled-service counts, limitations, and safe public URL validation.
- API-side `AirportContextService` using fixed OurAirports `airports.csv` and `runways.csv` URLs, live no-key defaults, explicit off/mock/live modes, selected-area size limits, server-resolved selected-aircraft focus through `/aircraft/:id/airport-context`, provider byte and row caps, capped runways per airport, request timeout, bounded dataset cache, and typed `ok`/`not_configured`/`error` result states.
- `GET /context/airports` route for validated area or point context, plus selected-aircraft airport context resolved from server aircraft state rather than browser-supplied aircraft positions.
- Web API client, `airportContextStore`, collapsible `AirportContextPanel`, area-context stack integration, and selected-aircraft drawer integration. The UI lists nearest airports/runways, shows attribution/limitations, refreshes on focus changes, and can enable the existing Airports map layer.
- Environment example variables for `AIRPORT_CONTEXT_MODE`, timeout, cache TTL, max results, and max runways per airport. No `VITE_` provider config or secrets were added.

Verification evidence:

- OurAirports live-source sanity check: fixed `airports.csv` and `runways.csv` URLs both returned HTTP 200 on HEAD requests.
- `corepack pnpm --filter @aisstream/shared test -- context-schemas`: passed, shared schema tests now 21 tests.
- `corepack pnpm --filter @aisstream/api typecheck`: passed after shared rebuild.
- `corepack pnpm --filter @aisstream/api test -- airport-context-service airport-context-route aircraft-routes`: passed, targeted API run reported 79 tests.
- `corepack pnpm --filter @aisstream/web typecheck`: passed.
- `corepack pnpm --filter @aisstream/web test -- AirportContextPanel airportContextStore AnalysisResult VesselDrawer`: passed, targeted web run reported 104 tests.
- Quality review findings remediated: enriched OurAirports results now feed a dynamic map source/layer, selected-aircraft airport refreshes key off the stable aircraft ID instead of live aircraft objects, and closed runways are excluded from summaries/display.
- Security review finding remediated: OurAirports response byte caps are now enforced while streaming provider responses, with `reader.cancel()` called as soon as the cap is crossed before decoding or storing an over-limit chunk.
- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed after streaming-cap remediation, full suite reported shared 21 tests, API 80 tests, and web 110 tests.
- `corepack pnpm build`: passed. Vite still reports the existing large JavaScript chunk warning.
- `corepack pnpm audit --prod`: passed, no known production dependency vulnerabilities.
- `git diff --check`: passed.
- Secret-pattern scan for OpenAI, AISstream, FIRMS, flight, and OpenSky key assignments: no matches.
- File-size guard: touched airport/map files remain within the 350-line preference; only the pre-existing alert files remain above the threshold.
- In-app Browser verification: app loaded at `http://localhost:5173/` with title `Sentinel Fusion`, map canvas rendered, console errors were empty, Map controls opened, and the `Airports` toggle changed `aria-pressed` from `false` to `true`. Screenshot capture succeeded.
- Focused cyber review result after remediation: no validated security issues remain for this airport/runway slice.

## Airspace Notice Contract Slice Evidence

Implemented on 2026-06-21:

- Shared `airspaceContextResponseSchema` and `AirspaceContextResponse` type with provider status, source attribution, analysed area, capped notices, validity windows, active/upcoming/high-severity summary counts, limitations, and optional error messaging.
- API-side `AirspaceContextService` with explicit `off`, `mock`, and `live` modes. Default and unimplemented live mode return a clear `not_configured` state until authorised FAA/SWIM, TFR, or licensed NOTAM/restriction provider access is configured.
- `GET /context/airspace` route with strict selected-area bounds validation, airspace-specific span/area limits, and no browser-supplied provider URL.
- Web API client, `airspaceContextStore`, collapsible `AirspaceContextPanel`, and area-context stack integration. The UI shows provider status, not-configured/error states, explicit mock-only notices when enabled, source attribution, limitations, and top notices without rendering provider text as HTML.
- Environment example variables for `AIRSPACE_CONTEXT_MODE` and `AIRSPACE_CONTEXT_MAX_RESULTS`. No `VITE_` provider config or secrets were added.

Verification evidence:

- `corepack pnpm --filter @aisstream/shared test -- context-schemas`: passed, shared schema tests now 22 tests.
- `corepack pnpm --filter @aisstream/api test -- airspace-context-service airspace-context-route app`: passed, targeted API run reported 86 tests.
- `corepack pnpm --filter @aisstream/web test -- AirspaceContextPanel airspaceContextStore AnalysisResult`: passed after test-query remediation, targeted web run reported 116 tests.
- `corepack pnpm typecheck`: passed after tightening typed mock notices.
- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed after final mock-window polish.
- `corepack pnpm test`: passed, full suite reported shared 22 tests, API 86 tests, and web 116 tests.
- `corepack pnpm build`: passed. Vite still reports the existing large JavaScript chunk warning.
- `corepack pnpm audit --prod`: passed, no known production dependency vulnerabilities.
- `git diff --check`: passed.
- Secret-pattern scan for OpenAI, AISstream, FIRMS, flight, analysis-token, and generic API-key assignments: no matches.
- File-size guard: touched airspace files remain within the 350-line preference.
- Local API smoke: `GET /context/airspace?south=50.68&west=-1.28&north=50.9&east=-0.86` returned `status:"not_configured"`, `mode:"off"`, zero notices, and the expected provider-not-configured limitation.
- In-app Browser verification: app loaded at `http://localhost:5173/` with title `Sentinel Fusion`, map canvas rendered, no Vite error overlay was present, and fresh console error/warning logs after reload were empty.
- Quality and cyber subagents disconnected before returning findings. Manual review found no validated security issue: the browser supplies only numeric bounds, the route validates shared bounds, over-large areas are rejected before provider access, no provider URL or key is accepted from the client, mock mode is explicit, and live mode does not scrape or claim live data.

## Filed Route Contract Slice Evidence

Implemented on 2026-06-21:

- Shared `filedRouteContextResponseSchema` and `FiledRouteContextResponse` type with provider status, source attribution, selected-aircraft identity, optional filed route, schedule fields, capped waypoints, confidence, status, limitations, and optional error messaging.
- API-side `FiledRouteContextService` with explicit `off`, `mock`, and `live` modes. Default and unimplemented live mode return a clear `not_configured` state until licensed FlightAware, Flightradar24, or equivalent filed-route provider access is configured.
- `GET /aircraft/:id/filed-route` route resolved from server aircraft state. The browser supplies only an aircraft id, not route text, callsign claims, provider URLs, or credentials.
- Web API client, `filedRouteContextStore`, and collapsible selected-aircraft `FiledRoutePanel`. The UI separates filed/planned route context from observed tracks and shows provider status, not-configured/error states, explicit mock-only routes when enabled, attribution, limitations, route text, schedule, and top waypoints.
- Environment example variables for `FLIGHT_ROUTE_CONTEXT_MODE`, `FLIGHT_ROUTE_CONTEXT_PROVIDER`, and `FLIGHT_ROUTE_CONTEXT_MAX_WAYPOINTS`. No `VITE_` provider config or secrets were added.

Verification evidence:

- `corepack pnpm --filter @aisstream/shared test -- context-schemas`: passed, shared schema tests now 23 tests.
- `corepack pnpm --filter @aisstream/api test -- filed-route-context-service aircraft-routes`: passed, targeted API run reported 90 tests.
- `corepack pnpm --filter @aisstream/web test -- FiledRoutePanel filedRouteContextStore VesselDrawer`: passed, targeted web run reported 122 tests.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed, full suite reported shared 23 tests, API 90 tests, and web 122 tests.
- `corepack pnpm build`: passed. Vite still reports the existing large JavaScript chunk warning.
- `corepack pnpm audit --prod`: passed, no known production dependency vulnerabilities.
- `git diff --check`: passed after normalising mechanically edited test fixtures back to LF-only content.
- Secret-pattern scan for OpenAI, AISstream, FIRMS, flight, analysis-token, and generic API-key assignments: no matches.
- File-size guard: touched filed-route files remain within the 350-line preference.
- Local API smoke: `GET /aircraft/{id}/filed-route` for a current live aircraft returned `status:"not_configured"`, `mode:"off"`, `provider:"flightaware"`, no route object, and the expected licensed-provider limitation.
- In-app Browser verification: app loaded at `http://localhost:5173/` with title `Sentinel Fusion`, map canvas rendered, no Vite error overlay was present, and fresh console error/warning logs after reload were empty.
- Manual quality and cyber review found no validated security issue: the route resolves selected aircraft from API state, accepts no provider URL, accepts no browser-supplied route/callsign/position claims, adds no browser secrets, keeps mock mode explicit, and live mode does not scrape or claim live filed-route data.

## Risks And Blockers

- Live NOTAM/TFR adapters, live filed-route adapters, sanctions API screening, Sentinel Hub imagery, and ACLED may require accounts, paid plans, licences, or API keys. The first implementation must support not-configured states without pretending to provide live data.
- Sanctions and conflict/protest matches can create false positives. UI wording must make these triage signals, not legal determinations.
- New map layers can overwhelm the dashboard. All overlays need toggles, caps, and conservative defaults.
- Provider APIs must be protected against SSRF by fixed base URLs, bounded coordinates, and strict response validation.

## Stop Condition

This goal is complete only when all 11 selected features are implemented or have a real provider-adapter/not-configured contract where external access is unavailable, the UI remains navigable and filterable, security review finds no unresolved high or medium issues, required checks pass, and docs match the implemented state.

## Next Ambitious Goals

- Implement server-owned intel cache and case workspace after provider confidence/status foundation.
- Add durable storage/auth if the dashboard moves beyond local POC use.

## Continuous Improvement Backlog

| Candidate | Source | Impact | Risk | Effort | Decision |
| --- | --- | ---: | ---: | ---: | --- |
| WebSocket reconnect with snapshot resync. | Architecture Agent | 9 | 4 | 5 | Backlog |
| Stale-contact pruning/tombstones. | Architecture Agent | 9 | 5 | 6 | Backlog |
| Server-owned intel cache. | Security model | 8 | 3 | 5 | Backlog |
| Case workspace. | Research Agent | 7 | 3 | 5 | Backlog |
