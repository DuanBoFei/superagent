# Spec: Observability

## Feature Overview

### What

A structured logging and cost tracking system that records every session, turn, model call, and tool execution as timestamped JSON events. It provides real-time cost calculation, a `--verbose` mode for debugging, and a session-end summary.

### Why

When an Agent makes a mistake (wrong fix, wasted tokens, infinite loop), the developer needs to answer: "What happened, when, and how much did it cost?" Without observability, the Agent is a black box. Structured logs are the foundation for debugging, cost control, and trust.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| JSON log file | One `.jsonl` file per session; each line = one event |
| Event types | session:start/end, turn:start/end, model:request/response/first_token, tool:start/end, error |
| Cost tracking | Real-time token × price → $ per turn and per session |
| --verbose mode | Print full model request/response to terminal |
| Session summary | Files changed + turn count + tokens + cost after session end |
| Log rotation | Per-file ≤ 50MB; max 3 rotated files |

### Out of Scope (MVP)

| Scope | Reason |
|-------|--------|
| OTEL / Langfuse integration | P1 (per 05-决策汇总) |
| Real-time dashboard | P2 (needs Web Dashboard) |
| Log query/search tool | P1 — use `grep` or `jq` on JSONL files |
| Alerting (cost thresholds, error rate) | P1 |
| Multi-session analytics | P1 |

---

## Acceptance Criteria

### AC-OBS-01: Session events logged

**Given** a full session from start to end
**When** the session completes
**Then** the log file contains: session:start, turn:start/end for each turn, model:request/response for each model call, tool:start/end for each tool execution, and session:end. All events have timestamps.

### AC-OBS-02: Cost tracking accurate

**Given** a model call with 1000 input tokens and 200 output tokens at $0.87/$0.435 per MTok
**When** the call completes
**Then** the cost is calculated as `(1000/1,000,000) * 0.435 + (200/1,000,000) * 0.87 = $0.0006` (rounded to 4 decimal places). The session summary shows cumulative cost.

### AC-OBS-03: --verbose shows full request

**Given** the user starts the Agent with `--verbose`
**When** a model call is made
**Then** the full request (system prompt + messages) and full response (all tokens) are printed to the terminal. API keys are redacted.

### AC-OBS-04: Session summary

**Given** a session with 5 turns, 3 files modified, 8000 total tokens, $0.005 cost
**When** the session ends
**Then** the terminal shows:
```
Session summary:
  Turns: 5
  Files changed: 3 (src/auth.ts, src/login.ts, tests/auth.test.ts)
  Tokens: 5,200 in + 2,800 out = 8,000 total
  Cost: $0.005
  Log: ~/.superagent/logs/2026-06-12-143021-abc123.jsonl
```

### AC-OBS-05: Log rotation

**Given** a log file approaching 50MB
**When** the next event is written
**Then** the current file is renamed to `.jsonl.1`, and a new `.jsonl` file is started. Max 3 rotated files; the oldest is deleted when the limit is exceeded.

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| Log directory doesn't exist | Create `~/.superagent/logs/` on first write |
| Write to log fails (permissions) | Warn "Cannot write to log file" once per session; continue without logging |
| Unknown model price | Cost line shows "Unknown" + model name; logged for later price table update |
| --verbose with 100K token prompt | Truncate terminal output to first 2000 + last 500 chars to avoid flooding |
| Session without any model calls | Session:start → session:end only (no turn/model/tool events) |

---

## Integration Contract

### Provided Interface

```
emit(event: LogEvent): void
getSessionStats(): { turns, tokens, cost, filesChanged }
getSessionLogPath(): string
```

### Event types

```
LogEvent =
  | { type: "session:start", sessionId, config: { model, maxTurns } }
  | { type: "session:end", exitCode }
  | { type: "turn:start", turnNumber }
  | { type: "turn:end", turnNumber, inputTokens, outputTokens }
  | { type: "model:request", model, estimatedInputTokens }
  | { type: "model:first_token", latencyMs }
  | { type: "model:response", model, inputTokens, outputTokens, cost }
  | { type: "tool:start", toolName, argsSummary }
  | { type: "tool:end", toolName, durationMs, success }
  | { type: "error", message, stack? }
```

### Cost model prices

| Model | Input $/MTok | Output $/MTok |
|-------|-------------|---------------|
| deepseek-v4-pro | 0.435 | 0.87 |
| deepseek-v4-flash | 0.14 | 0.28 |

---

### Consumed by

| Module | What |
|--------|------|
| 002-core-runtime | Calls `emit()` for each lifecycle event |
| 008-cli-repl | Calls `getSessionStats()` for summary, `--verbose` flag |

### Called by all modules that want to log

Any module can call `emit()` with a LogEvent — the observability module is a global singleton.
