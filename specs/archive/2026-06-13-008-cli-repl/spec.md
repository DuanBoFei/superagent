# Spec: CLI REPL

## Feature Overview

### What

A terminal-based Read-Eval-Print-Loop that is the sole user interface for MVP. It provides an input prompt for user messages, renders streamed AI text in real time, shows tool execution status, displays file diffs before writes, and handles permission approval prompts. It is the terminal rendering layer for everything the Core Runtime produces.

### Why

CLI is the MVP's only interface — no GUI, no IDE plugin, no web dashboard. The REPL experience directly defines the user's first impression. The PRD requires TTFB ≤ 2s and 30 tokens/s streaming — the renderer must not be the bottleneck.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| Input prompt | Read user input (multi-line support via `\` continuation or paste) |
| Streaming text render | Display model output word-by-word as tokens arrive |
| Tool call status | Show inline tool call summary: `[Read] src/file.ts → 150 lines` |
| Diff preview | Before Write/Edit, show unified diff with + and - lines |
| Permission prompt | Yes/No/Always interaction with 30s timeout |
| Todo panel | Sidebar showing current task list (when Task tool is used) |
| Session summary | After each turn: files changed + tokens used + cost |

### Out of Scope (MVP)

| Scope | Reason |
|-------|--------|
| Syntax highlighting in diffs | P1 |
| Scrollback / session history browse | Buffer provided by terminal emulator |
| Multi-line input editor (like readline's editor mode) | P1 — single line with paste support is enough |
| Command history search (Ctrl+R) | P1 — basic up/down arrow is fine |
| Custom themes / color schemes | P2 |
| Mouse interaction | Terminal is keyboard-only |

---

## Business Flow

```
[User types message] → Enter
    │
    ▼
Display: "Thinking..."
    │
    ▼
Stream tokens from Runtime
    ├── Text: render word-by-word in terminal
    ├── Tool call: show card "[ToolName] args → result"
    └── Turn end: show summary line
    │
    ▼
[If write/edit]
    Show diff (+, - lines)
    │
    ▼
[If permission needed]
    Yellow: "Allow [Bash] npm test ? [Y]es [N]o [A]lways"
    │
    ▼
[Turn complete]
    Display: "✓ 2 files changed | 1,500 tokens | $0.003"
    │
    ▼
[Ready for next input]
```

---

## Acceptance Criteria

### AC-CLI-01: Text streaming visible

**Given** the Agent is generating a text response
**When** tokens arrive from the Runtime
**Then** text appears in the terminal word-by-word as each token chunk arrives. The user sees partial output before the full response is complete.

### AC-CLI-02: Tool calls displayed

**Given** the Agent calls `Read("src/index.ts")`
**When** the tool call is dispatched and the result returns
**Then** the terminal shows `[Read] src/index.ts` while executing, then `[Read] src/index.ts → 50 lines` when complete. Failed tools show `[Read] src/index.ts ✗ File not found`.

### AC-CLI-03: Diff preview before write

**Given** the Agent is about to write to a file
**When** the Write or Edit tool is called
**Then** a unified diff is displayed showing lines to be added (+) and removed (-) in color. The diff appears BEFORE the permission prompt.

### AC-CLI-04: Permission prompt interaction

**Given** the Agent wants to run `npm test`
**When** the tool requires user approval
**Then** the prompt shows `⚠ Allow [Bash] npm test? [Y]es [N]o [A]lways allow this pattern` in yellow. User presses Y/N/A. On timeout (30s), auto-deny.

### AC-CLI-05: Session summary

**Given** a turn completes
**When** the Agent returns to IDLE
**Then** the terminal shows a summary line: `✓ Turn 3 | 2 files changed | 850 in + 320 out tokens | $0.002`.

### AC-CLI-06: Todo panel visibility

**Given** the Agent has created tasks via the Task tool
**When** tasks exist in the current session
**Then** the terminal's right side (or bottom) shows the task list with status indicators ([ ] pending, [~] in_progress, [✓] completed). The panel updates when tasks change.

### AC-CLI-07: Startup message

**Given** the user runs `superagent` in a terminal
**When** the config loads successfully
**Then** the terminal shows model name, project directory, and "Type a message or /help".

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| Terminal width < 80 columns | Diff and todo panel use minimal width; text reflows |
| Terminal width > 200 columns | Cap rendering width at 200 to prevent unreadable output |
| User pastes 5000+ character message | Accept and render; warn if input > 10K chars (from 002 spec) |
| Stream emits 100+ tokens/second | Render every token without dropping (terminal rendering is fast enough) |
| Diff > 200 lines | Truncate to first 100 + last 100 lines + "...{N} lines unchanged..." |
| Permission prompt during streaming | Pause text output; show prompt; resume on answer |
| Terminal resize during rendering | Recalculate width on next render cycle |
| Non-TTY stdout (piped to file) | Disable color codes and interactive prompts; output plain text |

---

## Integration Contract

### Consumes from Runtime

```
TurnEvent stream from 002-core-runtime.startTurn()
```

### Key rendering decisions

| Event | Render |
|-------|--------|
| `{ type: "text", content }` | Green (or default) word-by-word to stdout |
| `{ type: "tool_call", name, args }` | Dim text: `[{name}] {args_summary}` |
| `{ type: "tool_result", name, success, summary }` | `✓` or `✗` + summary |
| `{ type: "error", message }` | Red text to stderr |
| `{ type: "turn_end", summary }` | Newline + summary stats |
