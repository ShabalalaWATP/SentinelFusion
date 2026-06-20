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
| 6 | Marine weather layer | Drawn/named areas can fetch current marine conditions and forecast summaries, displayed in a collapsible OSINT panel and optionally on the map. Results include source, timestamp, limitations, and area bounds. | API-side Open-Meteo client first, with optional NOAA CO-OPS station enrichment later. Cache by rounded area/point and never call providers from browser code. |
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
| Coding Agent | Implement one coherent slice at a time, starting with features 1, 2, and 3. | `apps/web/src`, shared schemas as needed | Foundation slice implemented |
| Code Quality Agent | Review each implementation slice after code changes. | None | Complete for foundation slice, findings remediated |
| Code Architecture Agent | Check boundaries, file sizes, SOLID fit, and dead-code risk. | None | Pending |
| User Experience Agent | Verify rendered dashboard, panel navigation, layer filtering, and mobile fit. | None | Browser verified for foundation slice |
| Performance and Map Scalability Agent | Check map overlay caps and source update cost. | None | In progress |
| Cyber Security Agent | Threat model now, formal static/dynamic review after each slice. | None | Complete for foundation slice, no validated issues remain |
| Documentation Agent | Keep plan, changelog, development story, security notes, and README current. | `docs`, `README.md` | In progress |

## Stage Order

- [x] Discovery
- [x] Decision
- [x] Goal tool or loop-state initialised
- [x] Implementation: foundation slice, features 1, 2, and 3
- [x] Quality review: foundation slice
- [x] Security review: foundation slice
- [x] Browser verification: foundation slice
- [ ] Implementation: OSINT provider foundation and first no-key provider
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
| Defer NOTAM/TFR and filed-route enrichment until authorised provider credentials are available. | API Agent | 8 | 7 | 6 | 8 | Provider contract first |
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
- [ ] Docs updated

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

## Risks And Blockers

- NOTAM/TFR, filed routes, sanctions API screening, Sentinel Hub imagery, and ACLED may require accounts, paid plans, licences, or API keys. The first implementation must support not-configured states without pretending to provide live data.
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
