# Spec: Context Management

## Feature Overview

### What

A prompt composition and compaction system that builds the model's context window for each turn. It assembles a layered prompt (static system prefix → CLAUDE.md rules → tool definitions → conversation history → user message) and triggers automatic compaction when the context approaches the model's window limit.

### Why

Agent conversation history grows unboundedly — every turn adds user input, model output, and tool results. Without context management, the prompt overflows the model's context window (typically 128K tokens) within 30-50 turns, causing silent truncation or API errors. The compaction system ensures the Agent can sustain long sessions without losing critical context.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| Layered prompt assembly | System prompt (cached prefix) → rules → tool defs → history → user message |
| Prompt Cache prefix stability | Static content first (system prompt + tool defs); dynamic content last |
| CLAUDE.md loading | Read project-level rules file, inject into system prompt |
| Auto Compact | Trigger at < 20% context remaining; compress history into structured summary |
| Token estimation | Track token count per layer; use model-returned `usage` when available, fallback to char/4 |
| Tool result trimming | Trim tool outputs > 10K characters each to prevent single-result context blowup |

### Out of Scope (MVP)

| Scope | Reason |
|-------|--------|
| Structured memory (vector DB, episodic memory) | P1 |
| Microcompact (granular message-level deletion) | P1 — Auto Compact is sufficient for MVP |
| Reactive Compact (mid-turn compaction) | P1 |
| Multi-file rules (beyond CLAUDE.md) | P1 |
| User-defined compaction strategies | P1 |
| Context window visualization for user | P2 |

---

## Business Flow

```
composePrompt(messages, config)
    │
    ▼
Layer 1: Static System Prompt (cached)
    ├── Agent identity + capabilities
    ├── Safety rules
    └── Output format instructions
    │
    ▼
Layer 2: Project Rules (CLAUDE.md)
    ├── File exists → read + inject
    └── File missing → skip silently
    │
    ▼
Layer 3: Tool Definitions
    ├── All registered tool schemas
    └── Concurrency annotations
    │
    ▼
Layer 4: Conversation History
    ├── For each past turn: user_message → model_response → tool_results
    ├── If compacted: summary block instead of raw messages
    └── Trim tool outputs > 10K chars
    │
    ▼
Layer 5: Current User Message
    │
    ▼
Check total tokens
    │
    ├── < 80% of context window → send to model
    │
    └── ≥ 80% → trigger Auto Compact → re-check → send
```

### Auto Compact Algorithm

1. Take the oldest 50% of conversation messages (by token count)
2. Replace with a structured summary: "Previous conversation summary: {key decisions, files modified, errors encountered, current goal}"
3. Recalculate total tokens
4. If still ≥ 80% → compact next 25% → re-check
5. If after 3 compaction rounds still ≥ 80% → truncate oldest messages (hard cutoff)

---

## Acceptance Criteria

### AC-CTX-01: Fresh session prompt is well-formed

**Given** the Agent starts a new session with CLAUDE.md present
**When** the first prompt is composed
**Then** it contains the static system prompt first, followed by CLAUDE.md content, then tool definitions, then the user message. Conversation history section is empty.

### AC-CTX-02: CLAUDE.md absence handled

**Given** no CLAUDE.md in the project directory
**When** `composePrompt()` is called
**Then** the prompt is composed normally without the rules layer. No warning emitted.

### AC-CTX-03: Auto Compact triggers

**Given** a session approaching 80% of context window (simulated with small window for test)
**When** the next prompt is composed
**Then** history is compacted — the oldest messages are replaced with a summary block containing "Previous conversation summary". Total token count drops below 80%.

### AC-CTX-04: Compact preserves critical info

**Given** a session where the Agent fixed a bug in `src/auth.ts` and ran tests
**When** Auto Compact runs
**Then** the summary contains: "Modified: src/auth.ts", "Bug: null pointer in login handler", "Tests: passed". Generic chat is discarded.

### AC-CTX-05: Tool result trimming

**Given** a tool call (Read) that returns 50K characters
**When** the result is added to context
**Then** it is trimmed to 10K characters with a note: "[Output trimmed from 50K to 10K chars. First 5K + last 5K shown.]"

### AC-CTX-06: Token counting fallback

**Given** the model did not return `usage` in the response
**When** token count is estimated
**Then** it uses `Math.ceil(chars.length / 4)` and the count is annotated as "estimated" in logs. The Agent does not block.

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| CLAUDE.md > 50KB | Trim to first 50KB + warn "CLAUDE.md too large ({size}), truncated" |
| Empty conversation history (session start) | Skip compaction check entirely |
| After 3rd compaction still > 80% | Hard truncate oldest messages (remove entirely, not summarized) |
| System prompt changed between turns | Invalidate Prompt Cache for that turn (Anthropic-specific, no-op for DeepSeek) |
| Tool definition list changes (new tool added mid-session) | Rebuild Layer 3 entirely (breaks cache for that turn) |
| Messages contain Unicode/emoji | Token count uses char.length / 4 (over-estimates but safe for non-Latin scripts) |

---

## Integration Contract

### Provided Interface

```
composePrompt(messages: Message[], context: PromptContext): Prompt

PromptContext = {
  rulesFilePath: string         // from config (CLAUDE.md)
  toolDefinitions: ToolDef[]    // from tool registry (004)
  contextWindowTokens: number   // model's max (e.g., 128000)
  currentTokens: number         // from last model response usage
}

Prompt = {
  system: string
  messages: Message[]
  estimatedTokens: number
  compacted: boolean            // true if compaction ran this turn
}
```

### Consumed Config

| Config Key | Used For |
|------------|---------|
| `rulesFile` | Path to CLAUDE.md |

### Dependencies

| Depends on | For |
|------------|-----|
| 001-config | `rulesFile` |
| 004-builtin-tools | Tool definitions for Layer 3 |
