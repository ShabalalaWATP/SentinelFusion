# Comprehensive Security And Quality Check - 2026-06-21

## Scope

- Repository: `C:\AlexDev\AISstream`
- Inventory: 320 tracked files at scan start.
- Generated artefacts: local scanner artefacts under `%LOCALAPPDATA%\Temp\codex-security-scans\AISstream\6f20ede_20260621-234620`.
- Durable tracker: `docs/security/2026-06-21-file-security-tracker.csv`.

## Methods

- Manual source review across API runtime, web runtime, shared contracts, config, docs, and tests.
- Subagent review for API, web, shared/config, and candidate validation.
- SAST and dependency checks: `pnpm audit`, Trivy filesystem scan with production and dev dependencies, secret scan, misconfiguration scan, and targeted sink searches for auth, network, filesystem, parser, URL, and DoS surfaces.
- DAST/local probes: unauthorised analysis/context checks, CORS and WebSocket origin checks, config startup guards, and unauthorised FIRMS route verification.
- Required project checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Confirmed Findings

### SF-SEC-001: Unauthenticated FIRMS provider-key spend

- Severity: medium.
- Status: fixed.
- Affected area: `GET /context/fire-anomalies` in live FIRMS mode when `FIRMS_MAP_KEY` was configured.
- Impact: unauthenticated direct HTTP clients could spend NASA FIRMS provider quota by submitting valid bounded areas.
- Fix: require `ANALYSIS_API_TOKEN` before provider access when live FIRMS has a key, fail startup if a key is configured without a token, and send the existing protected API token from the web client.
- Regression coverage: API route tests, config parser tests, web API client tests, and local DAST probe returning `401` for unauthorised FIRMS access.

### SF-SEC-002: Dev-only esbuild advisory through tsx

- Severity: low.
- Status: fixed.
- Affected area: `tsx -> esbuild@0.28.0` in development tooling.
- Impact: Trivy reported GHSA-g7r4-m6w7-qqqr, an arbitrary file-read issue when running the development server on Windows.
- Fix: add a narrow pnpm override so `tsx` resolves `esbuild@0.28.1`.
- Regression coverage: `pnpm audit` and Trivy with dev dependencies now report no known vulnerabilities.

## Suppressed Candidates

- Token comparison timing in `auth.ts`: suppressed as not practically exploitable remotely with high-entropy tokens, uniform 401 response, network/runtime noise, and rate limiting.
- `AIS_REPLAY_FILE` path read: suppressed because the path is operator-controlled environment config, not remotely controlled input.
- Browser `sessionStorage` analysis token: accepted residual risk because no XSS sink was found; future XSS would expose the bearer token.
- Provider base URL SSRF: suppressed because provider hosts are fixed or operator-env controlled, while request inputs are numeric bounded coordinates.
- Missing-Origin HTTP CORS allowance: suppressed because no-Origin requests are not a browser cross-origin read primitive; WebSocket origin checks remain strict.

## Verification

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 5 shared test files, 31 API test files, 63 web test files.
- `pnpm build`: passed.
- `pnpm audit`: passed, no known vulnerabilities.
- Trivy production and dev filesystem scans: passed, 0 vulnerabilities, 0 misconfigurations, 0 secrets.
- Local DAST FIRMS unauthorised probe: passed, returned `401`.

## Residual Notes

- Semgrep was attempted through `npx` but was not available in this environment, so Trivy, pnpm audit, static sink searches, tests, DAST probes, and subagent review were used instead.
- Any real API keys or tokens previously exposed in chat or local `.env` files should be treated as exposed operational secrets and rotated outside the codebase.
