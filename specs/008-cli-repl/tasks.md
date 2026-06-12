# Tasks: CLI REPL

## Task Summary

14 tasks · 4 parallel groups · estimated 2-3 hours

---

## Group 1: Foundation (serial)

### T-01: Define CLI types + renderer dispatch
| | |
|---|---|
| **Source** | spec §Integration Contract |
| **Dependencies** | 002-runtime (types only) |
| **Verification** | `tsc --noEmit` |

**What to do:**
- Create `src/cli/types.ts`: DiffBlock, PermissionResult, TerminalConfig
- Create `src/cli/renderer.ts`: `dispatchEvent(event: TurnEvent, config: TerminalConfig): void`
  - Switch on event type → call correct renderer
  - No-op for unknown event types

---

## Group 2: Renderer modules (parallel — depend on T-01)

### T-02: Implement text renderer
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Unit test: text word-by-word to mock stdout |

Create `src/cli/text-renderer.ts`:
- `renderText(content: string, config: TerminalConfig): void`
- Word-boundary flushing: accumulate chars → flush on space/newline
- Line wrapping at terminal width
- No buffering beyond current word

### T-03: Implement tool renderer
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Unit test: tool call + result formatted correctly |

Create `src/cli/tool-renderer.ts`:
- `renderToolCall(name: string, args: object): void` → dim `[Name] args_summary`
- `renderToolResult(name: string, success: boolean, summary: string): void` → `✓` green or `✗` red
- Rate limit: max 1 render per 200ms (debounce concurrent tool calls)

### T-04: Implement diff renderer
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Unit test: diff output with correct +/- lines |

Create `src/cli/diff-renderer.ts`:
- `renderDiff(oldContent: string, newContent: string, filePath: string): void`
- Compute simple line-by-line diff (no library — character-level not needed)
- Output: green `+` for added lines, red `-` for removed lines, dim context
- > 200 lines → truncate: first 100 + `...{N} lines...` + last 100
- Sanitize non-printable chars

### T-05: Implement permission prompt
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Unit test: Y/N/A + timeout |

Create `src/cli/permission-prompt.ts`:
- `promptPermission(toolName: string, command: string): Promise<"approved" | "denied" | "always">`
- Display yellow: `⚠ Allow [{toolName}] {command}? [Y]es [N]o [A]lways`
- Read single keypress (no Enter needed) via stdin raw mode
- 30s timeout → return "denied"
- Restore stdin mode on answer/timeout

### T-06: Implement todo panel
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Unit test: task list rendered with status icons |

Create `src/cli/todo-panel.ts`:
- `renderTodoPanel(tasks: Task[]): void`
- Format: `[ ]` pending, `[~]` in_progress, `[✓]` completed
- If terminal ≥ 100 columns: render in right margin
- If terminal < 100 columns: render below current output
- Only renders when task list changes

### T-07: Implement summary line
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Unit test: summary formatted with correct numbers |

Create `src/cli/summary.ts`:
- `renderSummary(stats: TurnSummary): void`
- Format: `✓ Turn {N} | {files} files changed | {in}in + {out}out tokens | ${cost}`

---

## Group 3: REPL loop (depends on Group 2)

### T-08: Implement input handler
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Unit test: command parsing, /help output |

Create `src/cli/input.ts`:
- `createPrompt(): { question: (prompt: string) => Promise<string>; close: () => void }`
- Uses `readline.createInterface`
- Detects /commands: `/help`, `/exit`, `/plan`
- Multi-line paste: accepts input with embedded newlines
- Empty input → return empty string (caller handles skip)

### T-09: Implement REPL main loop
| | |
|---|---|
| **Dependencies** | T-02-T-08, 002-runtime |
| **Verification** | Integration test: simulate input, capture output |

Create `src/cli/repl.ts`:
- `startRepl(runtime: Runtime, config: Config): Promise<void>`
- Display startup header: `SuperAgent · {model} · {project_dir}`
- Loop:
  1. Show prompt `> `
  2. Read input (T-08)
  3. If empty → skip
  4. If /command → handle
  5. Else → `runtime.startTurn(input)`
  6. For each event → dispatch to renderer (T-01)
  7. After turn_end → show summary (T-07)
  8. Loop back to prompt

---

## Group 4: Wiring + Tests (parallel)

### T-10: Unit tests — text renderer
| | |
|---|---|
| **Dependencies** | T-02 |
Create `tests/cli/text-renderer.test.ts`: captures stdout, verifies word-by-word output.

### T-11: Unit tests — diff renderer
| | |
|---|---|
| **Dependencies** | T-04 |
Create `tests/cli/diff-renderer.test.ts`: simple diff, truncation, sanitize.

### T-12: Unit tests — permission prompt
| | |
|---|---|
| **Dependencies** | T-05 |
Create `tests/cli/permission-prompt.test.ts`: mock stdin, verify Y/N/A/timeout.

### T-13: Integration test — REPL
| | |
|---|---|
| **Dependencies** | T-09 |
Create `tests/cli/repl.test.ts`:
- Simulate user input "hello" → verify stdout contains streamed text
- Simulate /help → verify help text output
- Ctrl+C → REPL exits cleanly
- Empty input → skipped, prompt re-shown

### T-14: Update index.ts to use full REPL
| | |
|---|---|
| **Dependencies** | T-09 |
| **Verification** | `node dist/index.js` launches interactive REPL |

Update `src/index.ts`:
- Load config → initialize runtime → start REPL
- Handle SIGINT (Ctrl+C) for graceful shutdown
- Remove old skeleton code
