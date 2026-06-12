# Spec: Session Persistence

## Feature Overview

### What

An automatic session saving and recovery system. After every turn, the full session state (messages, tool results, task list, config snapshot) is written to local storage. On crash or intentional interrupt, the user can resume with `--resume` and continue from the last saved checkpoint.

### Why

Agent sessions can last 30+ minutes and involve complex multi-step tasks. Losing all context to a crash or accidental Ctrl+C is unacceptable. Session persistence is the safety net that makes the Agent trustworthy for real work.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| Auto-save after each turn | Serialize session state to SQLite |
| --resume flag | Load last session checkpoint; inject "continue" context |
| Checkpoint model | Save complete state at turn boundary (not mid-turn) |
| Session listing | `--list` flag to see past sessions |
| Crash recovery | SIGINT handler triggers emergency save before exit |

### Out of Scope (MVP)

| Scope | Reason |
|-------|--------|
| Session export/import | P1 |
| Named sessions | P1 — auto-generated IDs are sufficient |
| Session branching | P1 |
| Cross-machine sync | Explicitly not supported |
| Session search | P1 |
| Auto-cleanup of old sessions | P1 — manual deletion for MVP |
| Session compression (gzip) | P1 |

---

## Acceptance Criteria

### AC-SP-01: Auto-save after turn

**Given** a session where 3 turns have completed
**When** the session state is checked
**Then** all 3 turns (messages, tool results, token counts) are persisted. The save happens automatically without user action.

### AC-SP-02: Resume after crash

**Given** a session was interrupted (Ctrl+C or process crash) after 5 turns
**When** the user runs `--resume`
**Then** the Agent loads the 5-turn session, injects "You were interrupted. Continue from where you left off," and continues from turn 6.

### AC-SP-03: --list shows past sessions

**Given** 3 past sessions exist in the database
**When** the user runs `--list`
**Then** the output shows session ID, date, turn count, and first user message for each session.

### AC-SP-04: Save fails gracefully

**Given** the disk is full
**When** a turn completes and auto-save is attempted
**Then** the Agent warns "Session save failed (disk full)." The current turn continues normally (in-memory). The Agent does not crash.

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| Save file corrupted | `--resume` reports "Session data corrupted" + offers `--list` to see valid sessions |
| Save file > 100MB | Warn on startup; suggest manual cleanup |
| Concurrent `--resume` from two terminals | Second instance warns "Session in use" and starts a new session |
| First run (no sessions yet) | `--resume` reports "No previous sessions found" and starts fresh |
| Disk write fails mid-save | Atomic write: write to temp file → rename to target (no partial writes) |

---

## Integration Contract

### Provided Interface

```
saveSession(state: SessionState): Promise<void>
loadSession(sessionId: string): Promise<SessionState | null>
listSessions(): Promise<SessionSummary[]>
```

### Consumed

| Module | What |
|--------|------|
| 002-core-runtime | SessionState at each turn boundary |

### Called by

| Module | What |
|--------|------|
| 002-core-runtime | After each `turn:end` event |
| 001-config | On startup to check for --resume / --list flags |
