# Tasks: Context Management

## Task Summary

13 tasks · 4 parallel groups · estimated 2-3 hours

---

## Group 1: Foundation (serial)

### T-01: Define context types + system prompt
| | |
|---|---|
| **Source** | spec §Integration Contract |
| **Dependencies** | None |
| **Verification** | `tsc --noEmit`; system prompt string is non-empty |

**What to do:**
- Create `src/context/types.ts`: Message, Prompt, PromptContext, CompactionSummary
- Create `src/context/system-prompt.ts`: Static system prompt string defining Agent identity, capabilities (code analysis, bug fixing), output format (markdown + tool calls), safety rules (never guess file paths, always verify)

---

## Group 2: Layer modules (parallel — depend on T-01)

### T-02: Implement token counter
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass for ASCII, CJK, emoji |

Create `src/context/token-counter.ts`:
- `estimateTokens(text: string): number` — char.length / 4, ceil
- `trackUsage(usage: { input_tokens, output_tokens }): void` — store for next turn
- `getLastUsage(): { input_tokens, output_tokens } | null`

### T-03: Implement rules loader
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass: file exists, missing, > 50KB |

Create `src/context/rules-loader.ts`:
- `loadRules(filePath: string): string`
- File missing → return `""` (empty string)
- File > 50KB → read first 50KB + emit warning
- File encoding must be UTF-8
- Inject as: `"## Project Rules\n{rules_content}"`

### T-04: Implement tool defs layer
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Tests pass: formats tool list correctly |

Create `src/context/tool-defs-layer.ts`:
- `formatToolDefs(tools: ToolDef[]): string`
- Format each tool: name, description, parameters (Zod schema → human-readable)
- Inject as: `"## Available Tools\n{tool_list}"`
- Mark concurrency-safe tools: `[safe for parallel execution]`

### T-05: Implement history layer
| | |
|---|---|
| **Dependencies** | T-01, T-02 |
| **Verification** | Tests pass: normal history, tool result trimming |

Create `src/context/history-layer.ts`:
- `buildHistory(messages: Message[]): string`
- Format each message: role + content
- Tool results > 10K chars: trim to first 5K + last 5K + note
- If compacted: use summary block instead of raw messages for oldest portion

---

## Group 3: Composer + Compactor (serial — depends on Group 2)

### T-06: Implement compactor
| | |
|---|---|
| **Source** | spec §Auto Compact Algorithm |
| **Dependencies** | T-02, T-05 |
| **Verification** | Tests pass: compaction reduces tokens, preserves key info |

Create `src/context/compactor.ts`:
- `compact(messages: Message[]): { messages: Message[]; summary: string; tokensBefore: number; tokensAfter: number }`
- Select oldest 50% of messages by timestamp
- Extract: modified files, errors, key decisions, current goal
- Generate summary string (see plan §2 algorithm)
- Replace selected messages with single summary message

### T-07: Implement composer orchestrator
| | |
|---|---|
| **Source** | spec §Business Flow |
| **Dependencies** | T-03, T-04, T-05, T-06 |
| **Verification** | Integration test passes: full 5-layer prompt, compaction triggered |

Create `src/context/composer.ts`:
- `composePrompt(messages, context): Prompt`
- Assemble 5 layers in order
- Count tokens
- If ≥ 80% of contextWindowTokens → compact → recount (up to 3 rounds)
- If still ≥ 80% after 3 rounds → hard truncate
- Return `{ system, messages, estimatedTokens, compacted }`

### T-08: Create public API
| | |
|---|---|
| **Dependencies** | T-07 |
| **Verification** | Exports composePrompt |

Create `src/context/index.ts`:
- Re-export `composePrompt` from composer
- Update stub at `src/runtime/stubs/context.ts`

---

## Group 4: Tests (parallel)

### T-09: Unit tests — token counter
| | |
|---|---|
| **Dependencies** | T-02 |
Create `tests/context/token-counter.test.ts`:
- ASCII: `"hello"` → estimated 2 tokens (5/4 ceil)
- CJK: `"你好世界"` → estimated 1 token (4/4)
- Empty string → 0

### T-10: Unit tests — rules loader
| | |
|---|---|
| **Dependencies** | T-03 |
Create `tests/context/rules-loader.test.ts`:
- Existing file → returns content with header
- Missing file → `""`
- Large file → truncated + warning

### T-11: Unit tests — compactor
| | |
|---|---|
| **Dependencies** | T-06 |
Create `tests/context/compactor.test.ts`:
- Normal history → tokens reduced by ≥ 40%
- Summary contains modified files, errors, current goal
- Edge case: 1 message → no compaction needed (returns unchanged)
- Edge case: empty history → returns empty

### T-12: Integration test — composer
| | |
|---|---|
| **Dependencies** | T-07 |
Create `tests/context/composer.test.ts`:
- Fresh session → only system + user message (no history)
- With CLAUDE.md → rules appear in prompt
- Near-full context → compaction triggered, `compacted: true`
- After compaction → total tokens < 80% of window

### T-13: Integration test — with 002 stub
| | |
|---|---|
| **Dependencies** | T-08 |
Verify 002 runtime tests still pass with real context composer replacing the stub.
