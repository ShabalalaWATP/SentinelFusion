# Goal Loop State

## Loop ID

`2026-06-20-observed-track-clarity`

## Orchestrator

Main Codex Orchestrator Agent

## Product Goal

Make the routes feature clearer and more trustworthy by presenting it as observed track history, aligning route-panel lists with the map's active filters, and adding map markers for track start/latest points.

## User Value

Users can understand what the route control does: it shows movement reconstructed from received live AIS and flight positions, not filed or scheduled route plans. Selecting a track now zooms to a visible entity, and the panel no longer lists tracks hidden by the map's domain or area filters.

## Acceptance Criteria

- [x] Route UI copy distinguishes observed tracks from filed route data.
- [x] Vessel and aircraft track lines render from chronologically sorted points.
- [x] Vessel and aircraft tracks expose start and latest point marker data for MapLibre layers.
- [x] Selected tracks remain visually dominant without unsupported MapLibre gradient expressions.
- [x] Route panel uses the same visible-traffic selector as the map.
- [x] Selecting a vessel switches the map to the vessel domain so the selected vessel is visible.
- [x] Route-map and route-panel candidates use shared caps and always keep the selected tracked entity visible.
- [x] Route aircraft clicks keep the route panel open, matching vessel route behaviour.
- [x] Map source synchronisation is extracted so `MapCanvas.tsx` stays below the 350-line project target.
- [x] Focused tests cover marker data, shared filtering, route wording, selected-route preservation, aircraft route caps, and vessel/aircraft selection.

## Agent Assignments

| Agent | Responsibility | Write scope | Status |
| --- | --- | --- | --- |
| Research Agent | Identify first-loop improvement candidates, including environmental OSINT and NASA FIRMS. | None | Complete |
| Software Engineering Agent | Inspect current route/map implementation and choose a focused implementation slice. | None | Complete |
| Data Quality and Feed Reliability Agent | Review live-data trust risks from the architecture pass. | None | Complete |
| Coding Agent | Implement observed-track clarity, marker data, shared filtering, and tests. | `apps/web/src` | Complete |
| Code Quality Agent | Review the finished patch for correctness and maintainability. | None | Complete |
| User Experience Agent | Verify route panel and map behaviour in the in-app browser. | None | Complete |
| Performance and Map Scalability Agent | Check MapLibre update and route-marker implications. | None | Complete |
| Cyber Security Agent | Review frontend-only route/map patch after implementation. | None | Complete |
| Documentation Agent | Update loop state, change log, and development story. | `docs` | Complete |

## Stage Order

- [x] Discovery
- [x] Decision
- [x] Goal tool or loop-state initialised
- [x] Implementation
- [x] Performance review, if map/realtime/UI scale changed
- [x] Quality review
- [x] Security review after implementation slice
- [x] Final verification
- [x] Documentation
- [x] Next-goal selection

## Decision Record

| Recommendation | Source agent | Impact | Risk | Effort | Confidence | Decision |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Improve route/track clarity before adding another OSINT feed. | Orchestrator, implementation plan | 8 | 3 | 3 | 8 | Adopted |
| Add shared aircraft route cap with selected-aircraft preservation. | Code Quality and Cyber Security Agents | 8 | 3 | 2 | 9 | Adopted |
| Add live weather and ocean risk layer. | Research Agent | 9 | 4 | 6 | 7 | Implemented by later OSINT loop |
| Add NASA FIRMS active fire layer. | Research Agent | 8 | 5 | 6 | 7 | Implemented by later OSINT loop |
| Add source freshness and provider confidence controls. | Research and architecture agents | 8 | 3 | 5 | 8 | Implemented by later OSINT loop |

## Verification Gates

- [x] Focused web tests
- [x] Web typecheck
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] Browser verification
- [x] `pnpm audit --prod`
- [x] Security review
- [x] Docs updated

## Reviewer Findings Resolved

- Code quality review found selected vessel routes could disappear when outside the top-10 route cap. Fixed by preserving the selected routed vessel in the shared selector.
- Code quality and security review found aircraft route rendering was uncapped and inconsistent between map and panel. Fixed by adding a shared capped aircraft route selector that preserves the selected aircraft.
- Code quality review found aircraft route clicks left the routes panel. Fixed by making the target panel explicit for aircraft inspection.
- Code quality review found `MapCanvas.tsx` exceeded the project line target. Fixed by extracting map source and layer synchronisation to `mapCanvasSync.ts`.

## Risks And Blockers

- The route panel still shows observed historical tracks only. Filed route enrichment remains future work and should use licensed provider data only.
- Current live aircraft feed may still be rate-limited by OpenSky, which can reduce flight track coverage until the provider recovers.
- The earlier Vite large-chunk warning was reduced by later code splitting. The MapLibre chunk remains the largest production asset and should stay under observation during future map work.

## Stop Condition

Complete. Required checks pass, browser verification confirms the route panel and map still render, quality/security findings have been remediated, and docs record the changed behaviour.

## Next Ambitious Goals

- Continue improving provider reliability with snapshot resync after WebSocket reconnects.
- Add a server-owned intel cache so AI/web research context does not rely on browser-submitted cached intel.
- Add persistent domain defaults and mobile layout polish.

## Continuous Improvement Backlog

| Candidate | Source | Impact | Risk | Effort | Decision |
| --- | --- | ---: | ---: | ---: | --- |
| WebSocket reconnect with snapshot resync. | Architecture Agent | 9 | 4 | 5 | Backlog |
| Stale-contact pruning or tombstones in browser state. | Architecture Agent | 9 | 5 | 6 | Backlog |
| Source/stale-data filters and alert presets. | Implementation plan | 8 | 3 | 5 | Implemented |
| Live weather and marine OSINT layer. | Research Agent | 9 | 4 | 6 | Implemented |
| NASA FIRMS fire/thermal anomaly OSINT layer. | Research Agent | 8 | 5 | 6 | Implemented |
