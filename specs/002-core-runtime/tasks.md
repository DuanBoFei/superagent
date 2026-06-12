# Tasks: Core Runtime

## Task Summary

15 tasks · 5 parallel groups · estimated 3-4 hours

---

## Group 1: Foundation (serial)

### T-01: Define runtime types ✅
| | |
|---|---|
| **Source** | spec §States, spec §Integration Contract |
| **Dependencies** | 001-config (types only) |
| **Verification** | `tsc --noEmit` passes; State enum has all 8 states |
| **Status** | Complete |

**What to do:**
- Create `src/runtime/types.ts`
- Define `State` enum: IDLE, THINKING, TOOL_CALL, WAITING_APPROVAL, COMPACTING, INTERRUPTED, ERROR, COMPLETED
- Define `TurnEvent` discriminated union: text, tool_call, tool_result, turn_end, error
- Define `SessionState` interface (sessionId, turnNumber, messages, toolResults, state, interruptFlag, startedAt)
- Define `TurnContext` (what each turn needs: messages, config, tools)

---

## Group 2: Core modules (parallel — depend on T-01)

### T-02: Implement state machine ✅
| | |
|---|---|
| **Source** | spec §States diagram |
| **Dependencies** | T-01 |
| **Verification** | `pnpm vitest run tests/runtime/state-machine.test.ts` — all pass |
| **Status** | Complete (17 tests) |

**What to do:**
- Create `src/runtime/state-machine.ts`
- Implement `transition(current: State, event: string): State`
  - Define valid transitions as a Map: `State → { event → State }`
  - IDLE + "user_input" → THINKING
  - THINKING + "text_complete" → COMPLETED
  - THINKING + "tool_calls" → TOOL_CALL
  - THINKING + "error" → ERROR
  - TOOL_CALL + "all_done" → THINKING (loop back)
  - TOOL_CALL + "approval_needed" → WAITING_APPROVAL
  - WAITING_APPROVAL + "approved" → TOOL_CALL
  - WAITING_APPROVAL + "denied" → THINKING
  - THINKING + "interrupt" → INTERRUPTED
  - INTERRUPTED + "resume" → THINKING
  - COMPLETED + "next_turn" → IDLE
  - ERROR + "recover" → IDLE
  - Any state + "unknown" → ERROR (fallback)
- Guard: if transition not in map → return ERROR with reason

### T-03: Implement stream handler ✅
| | |
|---|---|
| **Source** | spec §Business Flow (stream response step) |
| **Dependencies** | T-01 |
| **Verification** | `pnpm vitest run tests/runtime/stream-handler.test.ts` — all pass |
| **Status** | Complete (5 tests) |

**What to do:**
- Create `src/runtime/stream-handler.ts`
- Implement `parseStream(stream: AsyncGenerator<Token>): AsyncGenerator<TurnEvent>`
  - Accumulates tokens into content blocks
  - Detects tool_use blocks: when `type: "tool_use"` seen, parse name + arguments
  - Yields `{ type: "text", content }` for text chunks
  - Yields `{ type: "tool_call", name, args }` for each tool call
  - On stream end, yields `{ type: "turn_end", ... }` if no tool calls, or signals "ready for tool dispatch"
- Handle malformed tool calls: if JSON args parse fails, yield `{ type: "error", message: "Invalid tool arguments" }`

### T-04: Implement tool dispatcher adapter ✅
| | |
|---|---|
| **Source** | spec §Business Flow (dispatch tools step) |
| **Dependencies** | T-01 |
| **Verification** | `pnpm vitest run tests/runtime/tool-dispatcher.test.ts` — all pass |
| **Status** | Complete (5 tests) |

**What to do:**
- Create `src/runtime/tool-dispatcher.ts`
- Implement `dispatchTools(calls: ToolCall[]): Promise<ToolResult[]>`
  - For MVP, calls the stub `dispatchTools` from stubs/
  - Formats each result: `{ name, success: boolean, output: string, error?: string }`
  - Partial failure: returns all results (success + failure), marks failed ones with `success: false`
  - Report consecutive identical calls: if the same (toolName + args) seen 3+ times in this turn, inject warning into results

### T-05: Implement turn lifecycle emitter
| | |
|---|---|
| **Source** | spec §Turn Lifecycle Events table |
| **Dependencies** | T-01 |
| **Verification** | `pnpm vitest run tests/runtime/turn-lifecycle.test.ts` — all pass |

**What to do:**
- Create `src/runtime/turn-lifecycle.ts`
- Implement `createEmitter()` returning `{ emit, on, off }`
  - `emit(event: TurnEvent)` — calls all registered listeners
  - `on(type: string, handler: Function)` — register listener
  - `off(type: string, handler: Function)` — unregister
- No external EventEmitter dependency — custom 20-line implementation

### T-06: Create stub modules
| | |
|---|---|
| **Source** | plan §4 (Stub interfaces table) |
| **Dependencies** | T-01 |
| **Verification** | Each stub file exports the expected function signature |

**What to do:**
- Create `src/runtime/stubs/` directory
- Create stub files: `context.ts` (composePrompt returns dummy prompt), `model.ts` (sendMessage yields "stub response"), `tools.ts` (dispatchTools returns dummy result), `permission.ts` (checkPermission returns allowed), `session.ts` (saveSession no-op), `observe.ts` (emit logs to console)
- Each stub logs `[STUB] <function-name> called` via console.debug

---

## Group 3: Query loop (depends on all Group 2)

### T-07: Implement query loop
| | |
|---|---|
| **Source** | spec §Business Flow diagram + §States |
| **Dependencies** | T-02, T-03, T-04, T-05, T-06 |
| **Verification** | `pnpm vitest run --reporter=verbose tests/runtime/query-loop.test.ts` |

**What to do:**
- Create `src/runtime/query-loop.ts`
- Implement `createQueryLoop(session: SessionState): AsyncGenerator<TurnEvent>`
  - while turnNumber < maxTurns AND not interrupted:
    - Emit `turn:start`
    - Call composePrompt (stub or real)
    - Call sendMessage → get AsyncGenerator
    - Iterate stream with parseStream
    - If tool calls: check permission → dispatch → inject results → loop
    - If text only: yield text events
    - If error: yield error event → break
    - Increment turnNumber
  - Emit `turn:end` with summary
  - Call saveSession

---

## Group 4: Public API + Tests (parallel — depend on T-07)

### T-08: Implement runtime public API
| | |
|---|---|
| **Source** | spec §Integration Contract |
| **Dependencies** | T-07, 001-config |
| **Verification** | `pnpm vitest run tests/runtime/runtime.test.ts` |

**What to do:**
- Create `src/runtime/runtime.ts`
- Implement `startTurn(userMessage: string): AsyncGenerator<TurnEvent>`
  - Creates/updates SessionState
  - Delegates to query loop
  - Sets up SIGINT handler (process.once('SIGINT', ...) sets interruptFlag)
- Implement `resumeSession(sessionId: string): AsyncGenerator<TurnEvent>`
  - Loads saved state from 009 stub
  - Injects "continue where you left off" system message
  - Delegates to query loop

### T-09: Unit tests — state machine
| | |
|---|---|
| **Dependencies** | T-02 |
| **Verification** | All assertions pass |

Create `tests/runtime/state-machine.test.ts`:
- All 8 states can transition as defined
- Unknown event → ERROR state
- Invalid transition (e.g., IDLE + "next_turn") → ERROR
- ERROR → IDLE recovery works
- All valid transitions return correct next state

### T-10: Unit tests — stream handler
| | |
|---|---|
| **Dependencies** | T-03 |
| **Verification** | All assertions pass |

Create `tests/runtime/stream-handler.test.ts`:
- Plain text stream → yields text events only
- Tool call stream → yields tool_call events with parsed args
- Mixed stream (text + tool) → yields text then tool_call events
- Malformed tool JSON → yields error event (not crash)

### T-11: Unit tests — tool dispatcher
| | |
|---|---|
| **Dependencies** | T-04 |
| **Verification** | All assertions pass |

Create `tests/runtime/tool-dispatcher.test.ts`:
- Empty calls → empty results
- Single call → single result
- Mixed success/failure → partial results returned
- 3 consecutive identical calls → warning injected

### T-12: Integration test — query loop with stubs
| | |
|---|---|
| **Dependencies** | T-07 |
| **Verification** | All assertions pass |

Create `tests/runtime/query-loop.test.ts`:
- Text-only message → loop completes in 1 turn, yields text event
- maxTurns=2 → loop stops after 2, yields turn_end with "max reached"
- Interrupt flag set mid-loop → loop breaks, yields turn_end with "interrupted"
- Simulated tool call → tool_call + tool_result events yielded

### T-13: Integration test — runtime with stubs
| | |
|---|---|
| **Dependencies** | T-08 |
| **Verification** | All assertions pass |

Create `tests/runtime/runtime.test.ts`:
- `startTurn("hello")` → returns AsyncGenerator, yields text, completes
- Ctrl+C during execution → interrupt flag set, turn ends gracefully
- `resumeSession("test-id")` → loads stub state, continues
- Two consecutive turns → turnNumber increments to 2

---

## Group 5: Wiring (depends on T-08)

### T-14: Update CLI entry point
| | |
|---|---|
| **Source** | PRD §6-F7, plan §4 |
| **Dependencies** | T-08, 001-config (T-13 from 001) |
| **Verification** | `node dist/index.js` starts, prints "SuperAgent ready", waits for input |

**What to do:**
- Update `src/index.ts`
- Load config via 001
- Initialize runtime
- For now: hardcoded "Hello" message → call `startTurn` → print streamed text → exit
- This will be replaced by full REPL in 008-cli-repl

### T-15: End-to-end smoke test
| | |
|---|---|
| **Dependencies** | T-14 |
| **Verification** | Smoke test passes |

Create `tests/runtime/smoke.test.ts`:
- `node dist/index.js` → exit 0, stdout contains "SuperAgent" or streamed text
- `node dist/index.js --resume test-id` → loads stub session (no crash)
