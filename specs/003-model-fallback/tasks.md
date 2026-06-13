# Tasks: Model Fallback

## Task Summary

14 tasks · 4 parallel groups · estimated 2-3 hours

---

## Group 1: Foundation (serial)

### T-01: Define model types ✅
| | |
|---|---|
| **Source** | spec §Integration Contract |
| **Dependencies** | 001-config (types) |
| **Verification** | ✅ `tsc --noEmit` passes; `tests/models/types.test.ts` passes |

**What to do:**
- ✅ Create `src/models/types.ts`
- ✅ Define `Prompt` (system + messages), `TokenChunk` discriminated union, `ModelConfig` (apiKey, baseUrl, model, timeout), `ModelError` class with `code` field

---

## Group 2: Core modules (parallel — depend on T-01)

### T-02: Implement SSE stream parser
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Unit test passes |

Create `src/models/client.ts` with:
- `parseSSEStream(response: Response): AsyncGenerator<TokenChunk>`
- Handles: `data: {...}`, `data: [DONE]`, empty lines, chunked reads
- Extracts `delta.content`, `delta.tool_calls`, `usage` from OpenAI-compatible format
- Yields TokenChunk for text, tool_use, and end (with usage)

### T-03: Implement retry logic
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Unit test passes |

Create `src/models/retry.ts`:
- `withRetry(fn, options): Promise<T>` where options = `{ maxRetries, baseDelay, onRetry }`
- 429 strategy: read `Retry-After` header, max 3 retries
- 5xx strategy: wait 2s, max 1 retry
- Timeout: AbortController with configurable timeout, max 1 retry
- Non-retryable errors: 401, 403, 400 — throw immediately

### T-04: Implement fallback orchestrator
| | |
|---|---|
| **Dependencies** | T-02, T-03 |
| **Verification** | Unit test passes |

Create `src/models/fallback.ts`:
- `fallbackRequest(prompt, primaryCfg, secondaryCfg): AsyncGenerator<TokenChunk>`
- Try primary with retry → exhaust → try secondary with retry → exhaust → throw
- Emit model:fallback event when switching
- Track: if primary times out 3 consecutive times in one session, skip primary for rest of session

---

## Group 3: Public API + Tests (parallel)

### T-05: Implement sendMessage() public API
| | |
|---|---|
| **Dependencies** | T-04, 001-config |
| **Verification** | Integration test passes |

Create `src/models/provider.ts`:
- `sendMessage(prompt: Prompt): AsyncGenerator<TokenChunk>`
- Reads config from 001
- Delegates to fallback orchestrator
- Replaces stub at `src/runtime/stubs/model.ts`

### T-06: Unit tests — SSE parser
| | |
|---|---|
| **Dependencies** | T-02 |
| **Verification** | All assertions pass |

Create `tests/models/client.test.ts`:
- Normal text delta → yields text chunks
- Tool call delta → yields tool_use chunk
- Final chunk with `[DONE]` → yields end chunk with usage
- Partial chunk (split across reads) → correctly reassembles
- Malformed JSON line → skips line, continues

### T-07: Unit tests — retry logic
| | |
|---|---|
| **Dependencies** | T-03 |
| **Verification** | All assertions pass |

Create `tests/models/retry.test.ts`:
- Function succeeds first try → no retry, result returned
- Fails with 503 → waits 2s, retries once, succeeds
- Fails with 429 → reads Retry-After, waits, retries
- Exhausts retries → throws with all errors collected
- 401 → throws immediately (no retry)

### T-08: Unit tests — fallback
| | |
|---|---|
| **Dependencies** | T-04 |
| **Verification** | All assertions pass |

Create `tests/models/fallback.test.ts`:
- Primary succeeds → uses primary only
- Primary 503 → retry → still 503 → fallback to secondary → success
- Both fail → throws ModelError with both errors
- Primary timeout 3 consecutive → skips primary for session
- model:fallback event emitted on switch

### T-09: Integration test — provider with mock HTTP
| | |
|---|---|
| **Dependencies** | T-05 |
| **Verification** | All assertions pass |

Create `tests/models/provider.test.ts`:
- Mock fetch to return valid SSE stream
- `sendMessage({...})` yields expected TokenChunks
- Real end-to-end: sendMessage → tokens → text content extracted

---

## Group 4: Smoke tests

### T-10: Smoke test — real API call (manual)
| | |
|---|---|
| **Dependencies** | T-05 |
| **Verification** | Manual run with real API key |

Create `tests/models/smoke.test.ts` (`.skip` by default — requires real API key):
- Set `SUPERAGENT_API_KEY` env var
- Call sendMessage with "Hello" → expect streamed response
- Verify `usage.input_tokens > 0` in final chunk
- Verify response content is non-empty string

### T-11: Update 002 stub
| | |
|---|---|
| **Dependencies** | T-05 |
| **Verification** | 002 runtime smoke test still passes with real provider |

Replace `src/runtime/stubs/model.ts` to re-export from `src/models/provider.ts`.

### T-12: Re-run 002 integration tests
| | |
|---|---|
| **Dependencies** | T-11 |
| **Verification** | `pnpm vitest run tests/runtime/` — all pass |

Verify that the real model provider doesn't break the Core Runtime integration tests.

---

## Execution Order

```
T-01 → {T-02, T-03} → T-04 → {T-05, T-06, T-07, T-08} → T-09 → T-10 → T-11 → T-12
```
