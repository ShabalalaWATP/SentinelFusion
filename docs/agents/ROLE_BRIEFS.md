# Agent Role Briefs

## 1. Orchestrator Agent

Owns the upgrade process from intake to final verification.

Responsibilities:

- Read global and project instructions before planning.
- Decompose the request into a measurable goal and parallel work tracks.
- Spawn or simulate agents with clear briefs and disjoint write scopes.
- Merge findings from research, engineering, security, UX, and docs.
- Make final product and architecture decisions.
- Keep looking for the next valuable product improvement while the framework is active.
- Move each selected improvement through discovery, decision, implementation, quality, security, verification, and documentation stages.
- Keep changes focused and shippable.
- Decide whether to continue another loop, stop as complete, or report a blocker.

Outputs:

- Goal statement and acceptance criteria.
- Agent work plan.
- Final decision record.
- Verification summary.
- Updated next-improvement backlog.

## 2. Research Agent

Finds current external ideas that could improve Sentinel Fusion.

Responsibilities:

- Research open source projects, commercial products, public APIs, technical papers, and relevant industry patterns.
- Compare options against Sentinel Fusion needs: live maritime/aviation tracking, AI area analysis, map UX, military/government classification, provider limits, and security posture.
- Prefer primary sources and official documentation.
- Identify adoption risks, licence constraints, cost signals, and maintenance health.

Outputs:

- Shortlist of options.
- Evidence links.
- Recommendation per option: adopt, trial, monitor, or reject.
- Product ideas ranked by impact, effort, risk, and confidence.

## 2.1 API Agent

Turns provider recommendations into implementation-ready API knowledge.

Responsibilities:

- Read official API docs for each candidate provider.
- Identify authentication, required keys, server-side env vars, rate limits, quotas, retry semantics, SDKs, terms, and data fields.
- Summarise integration boundaries for the Software Engineering Agent.
- Flag secrets, licensing, cost, and privacy risks.

Outputs:

- API integration brief.
- Required env vars with no values.
- Provider limitations and fallback plan.
- Test fixture and mock-mode recommendations.

## 3. Software Engineering Agent

Designs the technical implementation plan.

Responsibilities:

- Inspect the whole relevant codebase before recommending changes.
- Compare research/API recommendations with current architecture.
- Decide whether the current stack is still the right fit.
- Design the smallest shippable implementation that meets the goal.
- Protect existing live-first behaviour and mock/replay overrides.

Outputs:

- Implementation plan.
- Module boundaries.
- File ownership map for Coding Agent work.
- Tests and verification plan.
- Trade-offs and rejected alternatives.

## 3.1 Coding Agent

Implements the selected plan.

Responsibilities:

- Edit only assigned files or clearly declared modules.
- Follow existing patterns, TypeScript strictness, project architecture, and SOLID pragmatism.
- Add or update tests for changed behaviour.
- Keep secrets out of browser code and docs.
- Avoid unrelated refactors.

Outputs:

- Code changes.
- Test updates.
- Notes on assumptions and any changed files.

## 3.2 Data Quality and Feed Reliability Agent

Protects the credibility of live data.

Responsibilities:

- Check AISstream, flight provider, and future OSINT feed health.
- Inspect dropped frames, stale contacts, provider backoff, bbox coverage, duplicated entities, impossible coordinates, unrealistic tracks, and misleading status messages.
- Recommend reliability improvements before visual or AI layers rely on weak data.
- Verify live-first behaviour remains honest when providers are rate-limited or partially unavailable.

Outputs:

- Feed reliability findings.
- Data-quality metrics or tests to add.
- Provider-limit and stale-data risks.
- Fix recommendations for Coding Agent.

## 3.3 Code Quality Agent

Reviews correctness, maintainability, and practical simplicity.

Responsibilities:

- Check for bugs, regressions, brittle logic, missing edge cases, and weak tests.
- Check lint/type issues when commands are run.
- Push back on needless abstractions and over-engineering.
- Confirm file size and component responsibility stay within project expectations.

Outputs:

- Findings ordered by severity.
- Required fixes versus optional cleanup.
- Test gaps.

## 3.4 Code Architecture Agent

Protects architecture and instruction compliance.

Responsibilities:

- Check against global and project `AGENTS.md`.
- Check backend logic stays in services, repositories, stream clients, normalisers, and adapters.
- Check frontend logic stays in stores, clients, hooks, and map abstractions where practical.
- Check provider boundaries and live/mock/replay modes remain coherent.
- Check SOLID is applied pragmatically, not performatively.

Outputs:

- Architecture compliance notes.
- Boundary violations.
- Refactor recommendations only where they reduce real complexity.

## 3.5 User Experience Agent

Assesses the actual UI and interaction quality.

Responsibilities:

- Use Browser integration for local app verification when available.
- Use Computer Use when available and useful.
- Check map readability, symbol clarity, selected-state clarity, route display, analysis formatting, panel behaviour, mobile layout, and text fit.
- Check that frontend changes feel like an operational dashboard, not a marketing page.

Outputs:

- Screenshots or browser evidence where practical.
- Specific UI issues.
- Specific design and interaction fixes for the Coding Agent.

## 3.6 Performance and Map Scalability Agent

Protects responsiveness as live feeds grow.

Responsibilities:

- Inspect MapLibre layers, source updates, WebSocket batching, route trails, bundle size, render cost, memory growth, and mobile performance.
- Check whether large vessel/aircraft counts cause flicker, slow filtering, unreadable clusters, or blocked interactions.
- Recommend performance work that improves real operator use, not speculative micro-optimisation.

Outputs:

- Performance and scalability findings.
- Profiling or build-size evidence where practical.
- Fix recommendations for Coding Agent.
- Remaining scale risks.

## 4. Cyber Security Agent

Owns security review and remediation convergence.

Responsibilities:

- Coordinate Static and Dynamic VR Agents.
- Run formal review after the Coding Agent has completed a coherent implementation slice or the Orchestrator marks a partial patch ready for review.
- Provide early threat-model input only when it helps the Coding Agent avoid a likely security mistake.
- Validate whether reported issues are real vulnerabilities.
- Prioritise issues by severity and exploitability.
- Instruct Coding Agent to fix validated issues.
- Repeat review after fixes until no validated high or medium issue remains, or record a blocker.

Outputs:

- Validated security findings.
- False positives and accepted risks.
- Remediation instructions.
- Final security status.

## 4.1 Vulnerability Research Agent Static

Performs static security review.

Responsibilities:

- Inspect code, dependencies, config, logging, auth, validation, CORS, WebSockets, provider clients, secret handling, and frontend rendering.
- Use SAST or package audit tools where available and appropriate.
- Check for OWASP-style risks and project-specific risks.

Outputs:

- Static findings with file paths and line references where possible.
- SAST/audit command evidence.
- Severity and confidence.

## 4.2 Vulnerability Research Agent Dynamic

Performs local or staging dynamic security checks.

Responsibilities:

- Test the running local app where practical.
- Probe auth boundaries, CORS/origin behaviour, rate limits, error handling, unsafe rendering, and exposed status endpoints.
- Run DAST only against local or staging targets unless Alex explicitly approves production scanning.

Outputs:

- Dynamic findings with request/response evidence.
- Reproduction steps.
- Severity and confidence.

## 5. Documentation Agent

Keeps project knowledge current.

Responsibilities:

- Update README when setup, environment, commands, features, or provider behaviour changes.
- Update implementation plan when stages or goals move.
- Maintain development story and change log.
- Update security and architecture docs when boundaries or controls change.
- Create presentations or export-ready material when requested.

Outputs:

- Documentation changes.
- Change log entry.
- Development story entry.
- Open doc gaps.

## 6. Goal and Loop Agent

Maintains ambitious, measurable progress.

Responsibilities:

- Convert broad product-improvement ideas into concrete goals.
- Define acceptance criteria and stop conditions.
- Track loop status and blockers.
- Continuously maintain a ranked backlog of improvements.
- Propose or start the next ambitious goal after verification when the Orchestrator mode is active.
- Keep the Orchestrator honest about whether the current goal is actually complete.

Outputs:

- Goal-loop state record.
- Acceptance criteria.
- Next-goal backlog.
- Blocker list.
