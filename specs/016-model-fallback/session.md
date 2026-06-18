# Session: 016 Model Fallback

## Result

Feature 016 is complete and verified. SuperAgent now has a deterministic DeepSeek V4 Pro → V4 Flash fallback with formal `FallbackPolicy` (error classification + decision engine), model attempt observability events, and provider error secret redaction. Non-retryable errors (400/401/403) fail immediately without fallback. All decision logic is centralized in `evaluatePolicy()` with 14 dedicated policy tests. Observability events flow through the full chain: `fallbackRequest` → `provider.ts` → runtime stub → `query-loop.ts`.

## Final Metrics

- 18 tasks (T001-T018) — all complete
- 4 review defects (R1-R4) — all fixed
- Total tests: 41 (016-specific) + 14 (pre-existing affected) = 55 passed
- Typecheck: clean

## Changes Summary

### Phase 1: Policy Contracts (T001-T004)
- `src/models/fallback-policy.ts` — `classifyError()`, `evaluatePolicy()`, `ErrorCategory`, `FallbackAction`, `FallbackContext`
- `tests/models/fallback-policy.test.ts` — 14 tests covering all decision paths

### Phase 2: Provider Error Normalization (T005-T008)
- Error classification by HTTP status in `classifyError()`
- RETRY_EXHAUSTED unwrapping to first cause
- 9 classification tests (T005-T008 + edge cases)

### Phase 3: Fallback Orchestration (T009-T012)
- `fallbackRequest` catches primary errors, classifies via `evaluatePolicy`, throws terminal errors
- `withRetry` handles low-level retries; `evaluatePolicy` makes high-level fallback/fail decision
- 5 orchestration contract tests: body preservation, primary-only success, deterministic failure, non-retryable 400, observability events

### Phase 4: Observability & Safety (T013-T016)
- `redactProviderError()` in `src/observability/verbose.ts` — 9 tests covering JSON keys, query params, Bearer tokens, Authorization/X-API-Key headers, OpenRouter sk-or-v1 keys
- `ModelAttemptEvent` interface with `onAttemptStart`/`onAttemptEnd` callbacks
- 3 new `LogEvent` types: `model:attempt_start`, `model:attempt_end`, `model:fallback`

### Phase 5: Verification (T017-T018)
- Full 016 test suite: 41 tests, all green
- Typecheck: clean

### Review Defect Fixes
- **R1**: `evaluatePolicy` wired into `fallbackRequest` decision path
- **R2**: Observability callbacks wired through `emit` → `sendMessage` → `fallbackRequest` → callbacks
- **R3**: `skipPrimary` + `primaryTimeouts` reset on successful fallback (FR-MF-10 non-sticky)
- **R4**: `toModelError` in fallback.ts now handles `DOMException(AbortError)` → `TIMEOUT`

## Verification Log

```bash
pnpm typecheck                              # passed
pnpm test -- tests/models/fallback-policy.test.ts \
  tests/models/provider-fallback.test.ts \
  tests/models/provider-error-redaction.test.ts \
  tests/models/provider.test.ts \
  tests/runtime/query-loop.test.ts \
  tests/runtime/stubs.test.ts               # 55 passed
```

## Branch & Tag

Developed on `worktree-feat-011-mcp-server-integration` (shared with 011 MCP, 015 tool calling).
Merged to `master` as commit `d8c3d27`.
Tag: `v0.1.0-016-model-fallback`.

## Merge Notes

- 5 merge conflicts resolved: `src/observability/types.ts`, `src/runtime/types.ts`, `src/runtime/runtime.ts`, `tests/runtime/query-loop.test.ts`, `tests/runtime/runtime.test.ts`
- All conflicts were "both sides added different things" — combined both sides' event types, Prompt fields, and test cases
- `runtime.ts` resolution: combined hook dispatch (`dispatchSessionStart`/`dispatchStop`) with `withModelTools()` wrapping
- Git history scrubbed of pre-existing OpenRouter API key (231 commits, `git filter-repo`) before merge

## Notes

- Pre-existing smoke test flakiness (2 failures in `tests/runtime/smoke.test.ts`) is unrelated to 016 — confirmed by stash-and-repro
- The `evaluatePolicy` function's `retry` action is not used at runtime (low-level retries handled by `withRetry` in retry.ts); `evaluatePolicy` is called with exhausted retries to get a clean `fallback`/`fail` decision
- `resetFallbackState()` is exported for testing and future session-level reset
