# Goal Loop State

## Loop ID

`2026-06-20-aircraft-operations-filters`

## Orchestrator

Codex main agent.

## Product Goal

Make aircraft filtering operationally useful and consistent across the dashboard.

## User Value

An operator can isolate military, government, commercial, emergency, airborne, altitude-band, speed-band, or searched aircraft and see the same filtered live picture on the map, aircraft list, route panel, alerts, and military intel.

## Acceptance Criteria

- [x] Aircraft filters include search, classification presets, emergency, airborne, altitude, speed, active count, and reset.
- [x] Map aircraft points and observed tracks use the shared filtered subset while preserving an already selected aircraft on the map.
- [x] Aircraft list, route panel, alert centre, and military intel use the same filters.
- [x] Military intel shows both classified vessels and classified aircraft.
- [x] Tests cover pure filters, filter-store state, filter controls, route-panel filtering, and combined military intel.

## Agent Assignments

| Agent | Responsibility | Write scope | Status |
| --- | --- | --- | --- |
| Research Agent | Current product/API improvement recommendations | None | Complete |
| API Agent | Provider implications and env/secrets review | None | Complete |
| Software Engineering Agent | Bounded slice and file ownership | None | Complete |
| Coding Agent | Implement shared filters and panel changes | `apps/web`, docs | Complete |
| Code Quality Agent | Review via tests and lint/type/build | None | Complete |
| Code Architecture Agent | Check boundaries and live-store truth | None | Complete |
| User Experience Agent | Filter and panel UX recommendations | None | Complete |
| Cyber Security Agent | Static security review of touched surfaces | None | Complete |
| Documentation Agent | Update plan, README, story, change log | docs | Complete |

## Decision Record

| Recommendation | Source agent | Impact | Risk | Effort | Confidence | Decision |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Implement provider-aware aircraft filters first | Research/API, SWE | 9 | 3 | 4 | 8 | Accepted |
| Add new paid provider before UX filters | Research/API | 6 | 8 | 8 | 5 | Deferred |
| Move filtering server-side immediately | SWE | 5 | 5 | 7 | 5 | Deferred |

## Verification Gates

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] Browser or UI verification
- [x] Security review
- [x] Docs updated

## Risks And Blockers

- OpenSky rate limiting still depends on credentials, bbox size, and provider quota. This loop improves use of received live data but does not add new provider capacity.
- Large future feeds may need server-side filtered projections after the local dashboard proof of concept grows.
- Local `.env` files contain live secrets. Rotate the affected AISstream and OpenAI keys if the workspace has been shared, archived, screenshotted, or logged.
- Browser-supplied cached intel is now labelled as untrusted and unknown-entity intel is dropped, but a server-owned intel cache remains the stronger production design.

## Stop Condition

Stop when required checks pass, browser verification confirms the filter UI is usable, and security review reports no validated high or medium issue.

## Next Ambitious Goals

- Add source/stale-data filters and provider status settings.
- Add age-faded observed tracks with start/latest markers.
- Add structured AI area watch reports with change-since-last-run summaries.
