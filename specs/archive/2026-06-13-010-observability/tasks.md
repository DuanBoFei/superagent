# Tasks: Observability

## Task Summary

12 tasks · 3 parallel groups · estimated 1.5-2 hours

---

## Group 1: Foundation (serial)

### T-01: Define observability types + cost model
| | |
|---|---|
| **Source** | spec §Integration Contract, spec §Cost model prices |
| **Dependencies** | None |
| **Verification** | `tsc --noEmit`; cost table has entries for all models |

Create `src/observability/types.ts`:
- LogEvent discriminated union (10 event types from spec)
- SessionStats { turns, filesChanged, totalInputTokens, totalOutputTokens, totalCost }
- CostModel: `Record<string, { inputPrice: number; outputPrice: number }>` with DeepSeek prices from spec
- CostResult { inputCost, outputCost, totalCost }

---

## Group 2: Core modules (parallel — depend on T-01)

### T-02: Implement logger
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests: events written to file, rotation at 50MB (simulated) |

Create `src/observability/logger.ts`:
- `createLogger(sessionId: string, logDir: string): Logger`
- Creates `~/.superagent/logs/` if not exists
- Opens pino destination: `<logDir>/<YYYY-MM-DD>-<HHmmss>-<sessionId>.jsonl`
- `log(event: LogEvent): void` — pino.info with event as the log object
- Rotation: check file size every 100 events; if > 50MB → create new file with `.1` suffix
- Write failure → warn once, disable logging for rest of session (no crash)

### T-03: Implement cost tracker
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests: correct cost for known token counts |

Create `src/observability/cost-tracker.ts`:
- `createCostTracker(costModel: CostModel): CostTracker`
- `trackUsage(model: string, inputTokens: number, outputTokens: number): CostResult`
- `getSessionCost(): number` — running total
- Unknown model → return `{ inputCost: 0, outputCost: 0, totalCost: 0, unknownModel: true }`

### T-04: Implement stats collector
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests: stats accumulate correctly over multiple events |

Create `src/observability/stats-collector.ts`:
- `createStatsCollector(): StatsCollector`
- `recordEvent(event: LogEvent): void` — update internal counters
- `getSessionStats(): SessionStats` — returns cumulative stats
- Tracks: turn count, files changed (from tool:end events with Write/Edit), total tokens, total cost

### T-05: Implement verbose mode
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests: verbose output contains redacted API key |

Create `src/observability/verbose.ts`:
- `printVerbose(event: LogEvent): void` — if verbose enabled
- For `model:request`: print system prompt (first 2000 chars) + last user message
- For `model:response`: print full response text (first 2000 chars)
- Redact: `sk-[a-zA-Z0-9]+` → `sk-****`, `Authorization: *` → `Authorization: ****`
- Output to stderr (separate from stdout for text streaming)

---

## Group 3: Public API + Tests (parallel)

### T-06: Create public API
| | |
|---|---|
| **Dependencies** | T-02, T-03, T-04, T-05 |
| **Verification** | Integration test passes |

Create `src/observability/index.ts`:
- `createObservability(config: Config, sessionId: string): Observability`
- Returns: `{ emit, getSessionStats, getSessionLogPath }`
- `emit(event)` → log + update cost + update stats + verbose print
- Update stub at `src/runtime/stubs/observe.ts`

### T-07: Unit tests — logger
| | |
|---|---|
| **Dependencies** | T-02 |
Create `tests/observability/logger.test.ts`:
- Events written to temp file
- Each line is valid JSON
- All event types can be logged
- Rotation: simulate large file → new file created
- Write failure → no throw, warning emitted

### T-08: Unit tests — cost tracker
| | |
|---|---|
| **Dependencies** | T-03 |
Create `tests/observability/cost-tracker.test.ts`:
- V4 Pro: 5000 in + 1000 out = correct cost
- V4 Flash: same tokens = lower cost
- Unknown model → zero cost + unknown flag
- Cumulative cost across multiple calls

### T-09: Unit tests — stats collector
| | |
|---|---|
| **Dependencies** | T-04 |
Create `tests/observability/stats-collector.test.ts`:
- Multiple turn events → correct turn count
- Write tool end → file added to changed files list
- Token counts accumulate correctly

### T-10: Integration test — full pipeline
| | |
|---|---|
| **Dependencies** | T-06 |
Create `tests/observability/integration.test.ts`:
- Emit session:start → turn:start → model:* → tool:* → turn:end → session:end
- Log file contains all events
- Stats correct at each step
- Cost > 0 after model:response

### T-11: Wire to 002 runtime
| | |
|---|---|
| **Dependencies** | T-06 |
Update 002 runtime to call `emit()` for all lifecycle events (from spec §Turn Lifecycle Events table).

### T-12: Add --verbose flag to CLI
| | |
|---|---|
| **Dependencies** | T-05, 008-cli-repl |
Update `src/index.ts` to pass `--verbose` flag to observability. When enabled, verbose output goes to stderr during session.
