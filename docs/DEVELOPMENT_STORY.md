# Development Story

## 2026-06-20

- Added a project-level agentic upgrade framework so future broad product-improvement work can be coordinated by an Orchestrator Agent with research, API, engineering, coding, quality, architecture, UX, security, documentation, and goal-loop roles.
- Added reusable agent brief and goal-loop templates under `docs/agents/templates`.
- Linked the framework from the project `AGENTS.md` so future Codex runs know when to activate it.
- Activated the framework for the first product loop and implemented aircraft operations filters across map rendering, aircraft list, route panel, alert centre, and combined sea/air military intel. The loop used research, architecture, security, UX, documentation, and quality roles with the Orchestrator making the final scope decision.
- Refined the framework into a continuous improvement model: the Orchestrator keeps selecting and actioning the next shippable product goal, while formal cyber review now runs after code is ready rather than before the Coding Agent has finished a coherent slice.
- Added two specialist agents for live data quality and map/realtime scalability, created system prompts for every role, widened the Research Agent remit to unusual OSINT enrichment sources including NASA FIRMS, and defined a three-wave default research cadence with up to five waves when useful leads remain.
- Activated the framework for an observed-track clarity loop. The route panel now explains that tracks are reconstructed from received AIS and flight positions, the map has start/latest markers for vessel and aircraft tracks, route-panel lists share the same visibility rules as the map, and selecting a vessel switches the map back to the vessel domain.
- Closed the observed-track loop after quality and cyber review by adding shared capped aircraft route selection, preserving selected vessel and aircraft tracks outside normal caps, keeping aircraft route clicks in the route panel, and extracting map synchronisation out of `MapCanvas.tsx`.
- Started the OSINT expansion loop for selected features 1, 2, 3, 6, 7, 8, 9, 10, 11, 14 and 16. The first implementation slice delivered feed-confidence filters, a Settings provider-status drawer, and alert preset controls with persistence. Verification passed lint, typecheck, full tests, production build, production dependency audit, and browser checks for the new Settings and Alerts drawers.
