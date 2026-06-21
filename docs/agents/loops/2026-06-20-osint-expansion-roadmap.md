# Goal Loop State

## Loop ID

`2026-06-20-osint-expansion-roadmap`

## Orchestrator

Main Codex Orchestrator Agent

## Product Goal

Improve Sentinel Fusion with practical live OSINT context that does not depend on unapproved paid providers: feed confidence filters, provider status, alert preset controls, marine weather, NASA FIRMS active fires, OurAirports airport/runway context, NASA GIBS satellite snapshots, and ACLED conflict/protest overlays.

## Current Scope

Implemented:

- Feed confidence filters for stale contacts and unhealthy providers.
- Settings provider-status console for sea, air, and OSINT surfaces.
- Alert preset controls with persistence.
- Open-Meteo marine weather area context.
- NASA FIRMS active-fire area context using server-side `FIRMS_MAP_KEY`.
- OurAirports airport/runway context for analysed areas and selected aircraft.
- NASA GIBS satellite snapshot area context.
- ACLED conflict/protest area context using API-only credentials.

Removed on 2026-06-21:

- Airspace/NOTAM provider-contract slice.
- Filed flight route provider-contract slice.
- Sanctions/ownership provider-contract slice.

Removal reason: Alex does not intend to pay for those providers, so the codebase should not carry routes, contracts, UI panels, stores, tests, env settings, or active documentation for them.

## Acceptance Criteria

- [x] Remaining selected features use typed shared contracts.
- [x] Provider credentials, where needed, are server-side env vars only.
- [x] Provider-backed features expose `ok`, `not_configured`, and `error` states where relevant.
- [x] Browser UI does not claim mock or missing-provider data is live.
- [x] Map overlays are capped, toggleable, and removable.
- [x] Right drawer navigation remains overview, routes, alerts, military, settings/status, and OSINT detail without crowding the map.
- [x] Alert presets can be toggled and persisted locally.
- [x] Feed confidence filters apply consistently to map, routes, alerts, and entity lists.
- [x] Paid provider-contract slices are removed from source, tests, env examples, and current docs.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass after the removal cleanup.

## Verification Record

Previous completed slices passed the required checks at the time they were implemented. The current removal cleanup must be verified again with:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Risks And Blockers

- ACLED and FIRMS still need configured API-side credentials for live provider-backed context.
- OpenSky can rate-limit broad live flight polling, so provider errors must remain visible rather than silently falling back to mock data.
- New map layers can overwhelm the dashboard. Remaining overlays need toggles, caps, and conservative defaults.
- Provider APIs must stay protected against SSRF by fixed base URLs, bounded coordinates, strict response validation, and server-side credential handling.

## Next Ambitious Goals

- Add a server-owned intel cache so AI/web research context does not rely on browser-submitted cached intel.
- Add a case workspace for saving areas, entities, AI findings, screenshots, and source links.
- Improve provider reliability with snapshot resync after WebSocket reconnects.
- Add persistent domain defaults and mobile layout polish.
