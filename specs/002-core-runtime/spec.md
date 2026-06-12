# Spec: Core Runtime

## Feature Overview

### What

The Agent Core Runtime is the central message loop that drives every user interaction. It receives user input, composes a prompt, sends it to the model, streams the response, parses model output (text → terminal, tool calls → dispatcher), collects tool results, and loops until the task is complete or a limit is reached. It uses a State Machine to manage transitions and an AsyncGenerator pipeline for streaming tokens.

### Why

This is the physical heart of the Agent. Every other feature plugs into the Core Runtime: Model Fallback provides the model, Builtin Tools receive dispatch calls, Permission System intercepts tool execution, Context Management feeds the prompt, Observability records every turn. Without a working Core Runtime, there's no Agent — just a collection of libraries.

### States

```
IDLE → THINKING → (text output) → COMPLETED
                 → (tool calls)  → TOOL_CALL → THINKING (loop)
                                 → WAITING_APPROVAL → TOOL_CALL or IDLE
                 → (error)       → ERROR → IDLE or COMPLETED
                 → (interrupt)   → INTERRUPTED → IDLE (--resume)
                 → (compaction)  → COMPACTING → THINKING
```

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| State Machine | 8 states with defined valid transitions |
| Query Loop | while-loop: compose → send → receive → act → repeat |
| AsyncGenerator streaming | Yield tokens to CLI renderer as they arrive |
| Tool call parsing + dispatch | Extract tool calls from model response; route to Tool Scheduling (005) |
| maxTurns enforcement | Hard stop after N turns; output summary of done/pending |
| Interrupt handling | Ctrl+C gracefully stops current tool, saves state, exits |
| Turn lifecycle events | Emit events at turn start/end, tool start/end (consumed by 010-observability) |

### Out of Scope (MVP)

| Scope | Reason |
|-------|--------|
| Multi-turn planning (Plan-and-Execute) | /plan command is P1 (PRD F18) |
| Sub-agent spawning | Multi-agent is P1 (PRD W2) |
| Conversation branching / undo | P2 |
| Turn timeout recovery beyond maxTurns | Single hard limit; adaptive turns in v1.1 |
| Streaming cancellation mid-tool-execution | Only Ctrl+C at turn boundary in MVP |

---

## MVP Constraints

- Single conversation thread (no branching, no parallel sub-conversations)
- maxTurns default 50 (from config), hard cap 500
- Model response timeout: 120s (from config, via 003-model-fallback)
- Only one tool call batch per turn (model returns N tools → all executed → results sent back together)
- State transitions must complete synchronously — no state A→B while another transition is in flight
- **Clarification — "Turn" definition**: One turn = one user message plus all model responses and tool executions that follow, until the model emits a `stop_reason` (end_turn, stop_sequence, or max_tokens without tool calls). A turn may involve 0 tool calls (text-only) or many (multi-step tool use). The turn counter increments only when `stop_reason` is reached.
- **Clarification — State visibility**: The current state is internal to the Core Runtime. Other modules receive events (turn:start, tool:end, etc.) rather than polling state. The CLI may show a simplified status (thinking... / executing... / waiting...) derived from events.
- **Clarification — Partial tool failure handling**: If 005-tool-scheduling returns partial results (some tools failed), all results (success + failure) are injected into context for the next model call. The model decides whether to retry the failed tool, try an alternative approach, or abort. The Runtime does not make this decision.
- **Clarification -- --resume behavior**: When started with `--resume`, the Runtime loads the last saved turn state from 009-session-persistence, replays the last incomplete tool results into context, and triggers a new model call with the context "You were interrupted. Continue from where you left off." This is not a separate state — it enters THINKING directly from startup.

---

## Business Flow

```
User enters message
    │
    ▼
[IDLE] ──────────────────────────────────────────────────────────────┐
    │                                                                 │
    ▼                                                                 │
Emit "turn:start" event                                              │
    │                                                                 │
    ▼                                                                 │
Compose prompt (delegates to 007-context-management)                  │
    │                                                                 │
    ▼                                                                 │
[THINKING] ─ Send to model (delegates to 003-model-fallback)         │
    │                                                                 │
    ▼                                                                 │
Stream response via AsyncGenerator                                    │
    │                                                                 │
    ├── text/content_block ──→ emit to CLI renderer (008)             │
    │                                                                 │
    └── tool_use block ──→ [TOOL_CALL]                                │
            │                                                         │
            ▼                                                         │
        Check permissions (delegates to 006-permission-system)        │
            │                                                         │
            ├── denied ──→ [WAITING_APPROVAL] ──→ ask user           │
            │       │                         │                       │
            │       ├── user approves ────────┘                       │
            │       └── user denies ──→ return error to model         │
            │                                                         │
            ▼                                                         │
        Dispatch tools (delegates to 005-tool-scheduling)             │
            │                                                         │
            ▼                                                         │
        Collect results → inject into context → [THINKING] (loop) ───┘
            │
            │  (loop continues until stop_reason or maxTurns)
            ▼
[COMPLETED]
    │
    ▼
Emit "turn:end" event
Save session (delegates to 009-session-persistence)
Output turn summary (delegates to 010-observability)
    │
    ▼
[IDLE] ─ waiting for next user input
```

---

## Turn Lifecycle Events

The Core Runtime emits these events (consumed by 010-observability):

| Event | When | Data |
|-------|------|------|
| `session:start` | Agent process starts | session_id, config_summary |
| `turn:start` | User submits message | turn_number, input_text_length |
| `model:request` | Before sending to model | model_name, input_tokens (estimated) |
| `model:first_token` | First token received | latency_ms from request |
| `model:response` | Full response received | output_tokens, stop_reason, cost |
| `tool:start` | Tool begins execution | tool_name, args_summary |
| `tool:end` | Tool completes | tool_name, duration_ms, success/error |
| `turn:end` | Turn complete | turn_number, total_tokens, total_cost |
| `session:end` | Agent process ends | total_turns, total_cost, changed_files |

---

## Acceptance Criteria

### AC-RT-01: Single-turn text response

**Given** the Agent is in IDLE state
**When** the user types "What does git status do?"
**Then** the model streams a text response to the terminal, no tool calls are made, and the Agent returns to IDLE within 5 seconds.

### AC-RT-02: Multi-turn bug fix

**Given** a project with a known bug and the Agent has Read/Bash/Grep tools available
**When** the user describes the bug and asks the Agent to fix it
**Then** the Agent completes multiple turns: searches code → reads files → proposes fix → waits for approval → applies fix → runs tests. Each turn increments the turn counter. After the final turn, the Agent returns to IDLE.

### AC-RT-03: maxTurns enforcement

**Given** config sets `maxTurns: 3`
**When** the user asks a task that requires more than 3 tool-calling turns
**Then** after the 3rd turn, the Agent outputs "Maximum turns (3) reached" with a summary of what was and was not completed. The Agent does not make a 4th model call.

### AC-RT-04: Ctrl+C interrupt

**Given** the Agent is in THINKING state (model is generating a long response)
**When** the user presses Ctrl+C
**Then** the Agent immediately stops streaming, saves the session state (delegates to 009), and exits with the message "Interrupted. Resume with --resume." The exit code is 130.

### AC-RT-05: Model returns empty response

**Given** the Agent sends a request to the model
**When** the model returns an empty response (no text, no tool calls)
**Then** the Agent retries once. If still empty, it outputs "Model returned an empty response. Please try again." and returns to IDLE.

### AC-RT-06: Turn counter increments correctly

**Given** a session where the Agent makes 1 text-only turn and then 1 turn with 3 tool calls
**When** the session ends
**Then** the turn counter shows 2 (not 4). A "turn" = one user message + all model/tool iterations until stop_reason.

### AC-RT-07: AsyncGenerator error recovery

**Given** the model is streaming via AsyncGenerator
**When** the stream throws an unexpected error mid-generation
**Then** the Agent catches the error, outputs the last successfully yielded tokens (if any) + an error message, writes the error to the structured log, and returns to IDLE. The Agent does not crash.

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| User submits empty input (just presses Enter) | Ignore — stay in IDLE, no turn started |
| User input > 10,000 characters | Accept but warn "Large input ({N} chars) may exceed context window" |
| Model response contains both text AND tool calls | Process text first (stream it), then execute all tool calls |
| Model response contains tool calls for non-existent tools | Return error for that tool; include available tools list in next prompt |
| State transition conflict (e.g., Ctrl+C during state transition) | Queue the interrupt; process after current transition completes |
| maxTurns = 0 in config | Treat as "no limit" (useful for testing); hard cap still 500 |
| Turn number exceeds hard cap (500) | Force stop regardless of config |
| Session ID collision | Append timestamp suffix: `{session_id}-{Date.now()}` |

---

## Integration Contract

### Provided Interface

```
startTurn(userMessage: string): AsyncGenerator<TurnEvent>
```

Returns an async generator that yields `TurnEvent` objects:
- `{ type: "text", content: string }` — streamed text chunk
- `{ type: "tool_call", name: string, args: object }` — tool being called
- `{ type: "tool_result", name: string, success: boolean, summary: string }` — tool completed
- `{ type: "turn_end", summary: TurnSummary }` — turn complete

### Dependencies

| Depends on | For |
|------------|-----|
| 001-config | `maxTurns`, `model` |
| 003-model-fallback | `sendMessage(prompt): AsyncGenerator<Token>` |
| 005-tool-scheduling | `dispatchTools(calls: ToolCall[]): ToolResult[]` |
| 006-permission-system | `check(toolName, args): PermissionResult` |
| 007-context-management | `composePrompt(messages): Prompt` |
| 009-session-persistence | `saveTurn(state): void` |
| 010-observability | `emit(event): void` |
