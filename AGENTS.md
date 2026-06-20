# AISstream Project Instructions

These instructions override the global defaults for this repository where they are more specific.

## Project Scope

- This proof of concept is the AIS Intelligence Dashboard.
- Stages 0 to 3 are implemented.
- The API defaults to live AISstream ingestion and live OpenAI analysis.
- Keep mock and replay modes working as explicit offline development overrides.
- Keep AISstream consumption server-side. Never expose `AISSTREAM_API_KEY` to browser code, Vite env, logs, screenshots, or documentation examples with real values.

## Architecture

- Use a pnpm monorepo:
  - `apps/web`: React, Vite, TypeScript, Tailwind, MapLibre GL.
  - `apps/api`: Node.js, TypeScript, Fastify, Zod, WebSockets.
  - `packages/shared`: shared types and Zod schemas.
- Backend business logic belongs in services, repositories, stream clients, and normalisers, not route handlers.
- Frontend business logic belongs in stores, clients, and map abstractions, not large React components.
- Keep hand-written source files under 350 lines where practical.

## Required Checks

Run these before declaring implementation complete:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Environment

- API defaults to `AIS_MODE=live`.
- Allowed browser origins must be configured through `CORS_ORIGINS`.
- Web app API endpoints are configured through `VITE_API_BASE_URL` and `VITE_WS_URL`.
- `VITE_` variables are public. Do not put secrets in them.

## Agentic Upgrade Framework

- When Alex asks for the "Orchestrator Agent", "agentic upgrade loop", or asks to improve the product with concurrent agents, read `docs/agents/AGENTIC_UPGRADE_FRAMEWORK.md` before planning or editing.
- In that mode, the Orchestrator Agent keeps looking for the next valuable product improvement and may action each stage without asking again, unless the action is destructive, high-risk, external, paid, or blocked by missing credentials.
- Use concurrent subagents where the current Codex surface supports them. If subagents are unavailable, run the same roles sequentially and label the outputs.
- The Orchestrator Agent owns final integration decisions and must enforce this `AGENTS.md`, the global Codex instructions, live-data defaults, security rules, and the required checks above.
