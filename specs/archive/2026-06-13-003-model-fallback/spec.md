# Spec: Model Fallback

## Feature Overview

### What

A two-tier model API layer that sends requests to the primary model (V4 Pro) and automatically falls back to a secondary model (V4 Flash) when the primary is unavailable. It exposes a single `sendMessage()` interface that returns an `AsyncGenerator<Token>`. The caller (002-core-runtime) doesn't know which model served the request.

### Why

The product's core differentiator is model freedom at 1/17 the cost of Claude Code. If the primary model goes down, the Agent must not break — it must degrade gracefully with zero user-perceptible disruption beyond possibly slightly different output quality.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| Two-tier fallback | Primary (V4 Pro) → Secondary (V4 Flash) |
| Automatic switching | 429/5xx/timeout → retry → fallback |
| Unified interface | `sendMessage(prompt): AsyncGenerator<Token>` — caller agnostic to which model |
| Retry logic | 429: wait Retry-After (max 3 retries); 5xx: wait 2s (max 1 retry); timeout: 1 retry then fallback |
| Token counting | Extract `usage` from each response; return with final chunk |
| Streaming | Pass through model's SSE/stream as AsyncGenerator |

### Out of Scope (MVP)

| Scope | Reason |
|-------|--------|
| 3+ provider support (> 2 tiers) | MVP only needs V4 Pro + V4 Flash |
| Load balancing across providers | Simplicity; fallback is sequential |
| Request queuing / rate limit prediction | P1 |
| Response caching | P1 |
| Provider health monitoring dashboard | Observability covers logs; dashboard is P2 |

---

## MVP Constraints

- Only OpenAI-compatible API format (DeepSeek uses this)
- API key from config; started without → 001 rejects at startup (no runtime check needed)
- Fallback is sequential (not racing two models)
- Single request at a time (no concurrent model calls from Core Runtime)

---

## Business Flow

```
sendMessage(prompt)
    │
    ▼
Try PRIMARY (V4 Pro)
    │
    ├── Success ──→ stream tokens → yield to caller → DONE
    │
    └── Failure
          │
          ├── 429 (rate limit) → wait Retry-After → retry PRIMARY (max 3)
          ├── 5xx → wait 2s → retry PRIMARY (max 1)
          ├── Timeout (120s) → retry PRIMARY (max 1)
          │
          └── PRIMARY exhausted retries
                │
                ▼
            Emit "model:fallback" event
                │
                ▼
            Try SECONDARY (V4 Flash)
                │
                ├── Success → stream tokens → DONE
                │
                └── Failure
                      │
                      └── Throw ModelError("All models unavailable")
```

---

## Acceptance Criteria

### AC-MF-01: Primary succeeds — normal path

**Given** V4 Pro API is healthy
**When** `sendMessage()` is called with a prompt
**Then** tokens are streamed from V4 Pro, the response includes `model: "deepseek-v4-pro"`, and the latency is within the configured timeout.

### AC-MF-02: Primary fails → fallback succeeds

**Given** V4 Pro returns 503
**When** `sendMessage()` is called
**Then** V4 Pro is retried once → still fails → V4 Flash is called → tokens are streamed → response includes `model: "deepseek-v4-flash"` → a "model:fallback" event is emitted.

### AC-MF-03: All models unavailable

**Given** Both V4 Pro and V4 Flash are unavailable (simulated)
**When** `sendMessage()` is called
**Then** a `ModelError("All models unavailable")` is thrown after exhausting all retries. The error message includes attempted models and last error from each.

### AC-MF-04: Rate limit handled gracefully

**Given** V4 Pro returns 429 with `Retry-After: 3`
**When** `sendMessage()` is called
**Then** the Agent waits 3 seconds, retries V4 Pro. If it succeeds on retry, the response is normal. The 429 + retry is logged.

### AC-MF-05: Token usage returned

**Given** a successful model response
**When** the stream completes
**Then** the final chunk includes `{ usage: { input_tokens: N, output_tokens: M } }` extracted from the model response.

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| API returns non-JSON response | Throw `ModelError("Invalid response format")` |
| API key invalid (401/403) | Throw immediately — do NOT retry or fallback (key is wrong for all models) |
| Stream interrupted mid-response | Return partial tokens + warn "Stream interrupted" |
| Primary model times out 3 consecutive requests in one session | Skip primary for remainder of session; use secondary directly |
| Fallback model also returns 429 | Wait + retry secondary (same 429 logic as primary) |
| Prompt exceeds model's max context | Throw `ModelError("Prompt too long: {tokens} tokens exceeds {max}")` — do NOT truncate silently |

---

## Integration Contract

### Provided Interface

```
sendMessage(prompt: Prompt): AsyncGenerator<TokenChunk>

TokenChunk = {
  type: "text" | "tool_use" | "end"
  content?: string
  tool_call?: { name: string; arguments: object }
  usage?: { input_tokens: number; output_tokens: number }
  model?: string
  finish_reason?: string
}
```

### Consumed Config

| Config Key | Used For |
|------------|---------|
| `apiKey` | Authorization header |
| `baseUrl` | Primary model endpoint |
| `model` | Primary model name |
| `fallbackModel` | Secondary model name |
| `fallbackBaseUrl` | Secondary endpoint (defaults to `baseUrl` if not set) |
