# State: 016 Model Fallback

Status: Completed
Date: 2026-06-16
Tag: v0.1.0-016-model-fallback

## Final Verification

- `pnpm typecheck` — passed
- `pnpm test -- tests/models/fallback-policy.test.ts tests/models/provider-fallback.test.ts tests/models/provider-error-redaction.test.ts tests/models/provider.test.ts tests/runtime/query-loop.test.ts tests/runtime/stubs.test.ts` — passed, 55 tests
- Full suite (`pnpm test`) — 503 passed (2 pre-existing smoke test flaky failures unrelated to 016)

## Completed Scope

- Formal `FallbackPolicy` module (`fallback-policy.ts`) with `classifyError()` and `evaluatePolicy()` as standalone testable unit (14 policy tests)
- Error classification at provider boundary: HTTP status codes (429/5xx/400/401/403/404), error codes (TIMEOUT/NETWORK_ERROR), RETRY_EXHAUSTED unwrapping
- Non-retryable errors (400/401/403) skip fallback entirely (FR-MF-03)
- Same prompt, messages, and tools sent to fallback model, changing only model id (FR-MF-04)
- Capped model attempts with deterministic `ALL_MODELS_UNAVAILABLE` error (FR-MF-05/06)
- Model attempt observability: `onAttemptStart`/`onAttemptEnd` callbacks with duration tracking (FR-MF-07)
- Secret redaction in provider errors: `redactProviderError()` covering 4 leak patterns (JSON keys, query params, Bearer tokens, HTTP headers) (FR-MF-08)
- Non-sticky fallback: `skipPrimary` + `primaryTimeouts` reset after successful fallback (FR-MF-10)
- 3 new `LogEvent` types (`model:attempt_start`, `model:attempt_end`, `model:fallback`) wired through `provider.ts` → runtime stub → `query-loop.ts`

## Review Defects Fixed

4 defects found in code review, all resolved:

| # | Category | Description | Status |
|---|----------|-------------|--------|
| R1 | Cross-cutting | `evaluatePolicy` not wired into `fallbackRequest` — replaced inline check with `evaluatePolicy()` call | Fixed |
| R2 | Cross-cutting | Observability callbacks not connected — added event types + wired `emit` through full chain | Fixed |
| R3 | Resilience | `skipPrimary` sticky across requests (violated FR-MF-10) — reset on successful fallback | Fixed |
| R4 | Defensive | Duplicate `toModelError` missing AbortError handling — aligned with retry.ts version | Fixed |

## Branch Decision

016 developed on `worktree-feat-011-mcp-server-integration` (shared worktree with 011/015). Tag `v0.1.0-016-model-fallback` marks the feature completion point.
