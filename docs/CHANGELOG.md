# Change Log

## Unreleased

- Added the Sentinel Fusion agentic upgrade framework under `docs/agents`.
- Added Orchestrator Agent activation guidance to the project `AGENTS.md`.
- Added starter development story and change log documents for the Documentation Agent to maintain.
- Added shared aircraft operations filters for search, classification presets, emergency, airborne, altitude, and speed.
- Applied aircraft filters consistently to the map, aircraft list, route panel, alert centre, and military intel panel.
- Expanded Military Intel from vessel-only to combined sea/air classified contacts with aircraft focus and web-intel actions.
- Hardened `/analysis` so forged cached intel for unknown entities is dropped and remaining browser-supplied cached intel is labelled as untrusted secondary context.
- Updated the agentic upgrade framework so Orchestrator mode keeps looking for the next product improvement, can action each stage without repeated approval, and runs formal cyber review after an implementation slice is ready.
- Added Data Quality and Feed Reliability plus Performance and Map Scalability agents, widened Research Agent scope to out-of-the-box OSINT sources such as NASA FIRMS, and added explicit agent system prompts plus research-wave and goal-tool rules.
- Improved the routes feature so it is presented as observed AIS/flight track history, with map start/latest markers, chronological track rendering, shared map/panel filtering, capped route rendering for aircraft, selected-route preservation, and vessel selection that switches back to a visible vessel domain.
- Added server-side OSINT context slices for marine weather, NASA FIRMS active fires, OurAirports airports/runways, airspace provider status, filed-route provider status, vessel sanctions/ownership provider status, NASA GIBS satellite snapshots, and ACLED-backed conflict/protest area context.
