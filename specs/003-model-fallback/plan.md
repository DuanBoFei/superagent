# Plan: Model Fallback

## 1. Project File Structure

```
src/
└── models/
    ├── types.ts              # Prompt, TokenChunk, ModelConfig, ModelError
    ├── client.ts             # HTTP client: POST to OpenAI-compatible /chat/completions
    ├── retry.ts              # Retry logic: 429/5xx/timeout strategies
    ├── fallback.ts           # Two-tier orchestrator: primary → secondary
    └── provider.ts           # Public API: sendMessage()

tests/
└── models/
    ├── client.test.ts
    ├── retry.test.ts
    ├── fallback.test.ts
    └── provider.test.ts
```

| File | Responsibility |
|------|---------------|
| `types.ts` | Prompt, TokenChunk, ModelError class, ModelConfig from 001-config |
| `client.ts` | Raw HTTP call (fetch or Bun.fetch) to OpenAI-compatible endpoint; SSE parsing |
| `retry.ts` | Pure retry logic: `withRetry(fn, strategy): Promise<T>` — configurable backoff |
| `fallback.ts` | Two-tier orchestrator: try primary with retry → on exhaustion, try secondary |
| `provider.ts` | `sendMessage()` — thin wrapper that calls fallback orchestrator |

---

## 2. Data Flow

```mermaid
flowchart TD
    REQ["sendMessage(prompt)"]
    
    subgraph FALLBACK["Fallback Orchestrator"]
        P["Try PRIMARY<br/>with retry strategy"]
        P_OK{"Success?"}
        P_FAIL["PRIMARY exhausted"]
        S["Try SECONDARY<br/>with retry strategy"]
        S_OK{"Success?"}
        FAIL["Throw ModelError"]
    end
    
    subgraph RETRY["Retry Logic"]
        CALL["HTTP POST<br/>SSE streaming parse"]
        CHECK{"Status?"}
        OK["200 → yield tokens"]
        RATE["429 → wait<br/>Retry-After"]
        SERV["5xx → wait 2s"]
        TIMEOUT["Timeout → retry"]
    end
    
    DONE["Return TokenChunks"]

    REQ --> P
    P --> CALL
    CALL --> CHECK
    CHECK --> OK
    CHECK --> RATE
    CHECK --> SERV
    CHECK --> TIMEOUT
    RATE -->|"retries < 3"| CALL
    SERV -->|"retries < 1"| CALL
    TIMEOUT -->|"retries < 1"| CALL
    RATE -->|"exhausted"| P_FAIL
    SERV -->|"exhausted"| P_FAIL
    TIMEOUT -->|"exhausted"| P_FAIL
    OK --> DONE
    P_OK -->|"yes"| DONE
    P_FAIL --> S
    S --> CALL
    S_OK -->|"yes"| DONE
    S_OK -->|"no"| FAIL
    
    style DONE fill:#6f6,stroke:#333
    style FAIL fill:#f66,stroke:#333
```

---

## 3. Dependencies

### Runtime

| Package | Version | Why |
|---------|---------|-----|
| TypeScript | ^5.5 | Strict mode |

- HTTP client: `fetch` (native in Node.js 22+ and Bun)
- SSE parsing: custom (~30 lines, parse `data: {...}\n\n` lines)
- No third-party HTTP/SSE library

### Dev

| Package | Version | Why |
|---------|---------|-----|
| `vitest` | ^2 | Test runner; mock fetch with `vi.fn()` |

---

## 4. Integration Points

### Consumes

| Module | What |
|--------|------|
| 001-config | `apiKey`, `baseUrl`, `model`, `fallbackModel`, `fallbackBaseUrl` |

### Provides to

| Module | What |
|--------|------|
| 002-core-runtime | `sendMessage(prompt): AsyncGenerator<TokenChunk>` |

### Stub replacement

The stub at `src/runtime/stubs/model.ts` is replaced by `src/models/provider.ts`. The function signature is identical — no changes needed in 002.

---

## 5. Risk Points

| # | Risk | Mitigation |
|---|------|------------|
| R1 | SSE parsing edge cases (chunked across TCP packets, empty data lines, `[DONE]`) | Test with raw SSE byte streams; handle partial chunks with buffer |
| R2 | DeepSeek API format differs from OpenAI in subtle ways | Isolate differences in client.ts adapter; test against real DeepSeek API early |
| R3 | Token counting inconsistency between models | Use model's `usage` field; if missing, estimate with char/4; always mark "estimated" |
| R4 | 401/403 not retried but also might be transient (key rotation) | Document in error message: "Check your API key" |
| R5 | Connection refused (DNS/network) vs server error | Distinguish: network errors skip retry (no point), server errors retry |
