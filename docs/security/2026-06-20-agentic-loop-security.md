# Security Review: Agentic Loop Aircraft Filters

Date: 2026-06-20

## Scope

- Aircraft filter UI and shared filtering helpers.
- Map, aircraft list, route panel, alerts, and military intel panel integration.
- `/analysis` handling for cached vessel and aircraft intel.
- Local secret exposure checks reported by the Cyber Security Agent.

## Findings

### Local Environment Secrets

Local `.env` files contain live AISstream and OpenAI secret values. These files are ignored by `.gitignore`, and no browser bundle or documentation file was found to contain those secret values during the review, but local secrets should still be treated as exposed if the workspace has been shared, archived, screenshotted, or logged.

Remediation:

- Rotate the affected AISstream and OpenAI keys outside this code change.
- Keep real values only in local `.env` files or a secret manager.
- Continue keeping `.env.example` as names only.

### Client-Supplied Cached Intel

The analysis route previously accepted cached `vesselIntel` and `aircraftIntel` from the browser and forwarded it as cached public-source intelligence.

Remediation implemented:

- Intel for vessels or aircraft absent from the current server snapshot is dropped.
- Remaining browser-supplied intel is labelled as untrusted secondary context before being passed to OpenAI.
- Regression tests now cover forged intel for unknown aircraft and vessels.

Remaining risk:

- The browser can still submit cached intel for a valid entity ID. It is now labelled as untrusted, but a server-owned intel cache should replace browser-submitted cached intel before public deployment.

## Verification

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed.
- Browser QA: no console warnings or errors in tested desktop and mobile flows.
