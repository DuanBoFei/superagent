# Tasks: Permission System

## Task Summary

12 tasks · 3 parallel groups · estimated 1.5-2 hours

---

## Group 1: Foundation (serial)

### T-01: Define permission types + blacklist
| | |
|---|---|
| **Source** | spec §Business Flow, §Integration Contract |
| **Dependencies** | None |
| **Verification** | `tsc --noEmit`; blacklist has ≥ 5 entries |

Create `src/permissions/types.ts`:
- `PermissionResult = "approved" | "denied" | "always"`
- `PermissionEvent { toolName, argsSummary, decision, matchedRule?, timestamp }`
- `PromptFn = (toolName: string, command: string) => Promise<PermissionResult>`

Create `src/permissions/blacklist.ts`:
- Default blacklist patterns that always force ask:
  - `Bash:rm -rf /*`
  - `Bash:rm -rf ~*`
  - `Bash:curl * | bash`
  - `Bash:curl * | sh`
  - `Bash:wget * | bash`
  - `Bash:eval *`
  - `Bash:sudo *`
  - `Bash:git push --force *`
  - `Bash:git push -f *`
  - `Bash:chmod 777 *`
  - `Write:/etc/*`
  - `Write:~/.ssh/*`

---

## Group 2: Core modules (parallel — depend on T-01)

### T-02: Implement pattern matcher
| | |
|---|---|
| **Dependencies** | T-01 |
| **Verification** | Unit tests: exact, wildcard, no match, edge cases |

Create `src/permissions/matcher.ts`:
- `matchPattern(toolName: string, args: object, pattern: string): boolean`
- Split pattern at first `:` → tool part + args part
- Tool part: exact match or `*`
- Args part: convert to regex (escape special chars, `*` → `.*`)
- Test args string (all arg values joined with space)

### T-03: Implement permission checker
| | |
|---|---|
| **Dependencies** | T-02 |
| **Verification** | Unit tests for all 4 paths: blacklist, deny, approve, ask |

Create `src/permissions/checker.ts`:
- `createChecker(config: PermissionsConfig, promptFn: PromptFn): { checkPermission(toolName, args): Promise<PermissionResult> }`
- Step 1: Match against blacklist → force ask (skip auto-approve/deny)
- Step 2: Match against deny patterns → denied
- Step 3: Match against auto-approve patterns → approved
- Step 4: Neither → call promptFn
- "Always" response → add pattern to in-memory autoApprove list
- API key redaction in log: regex replace `sk-[a-zA-Z0-9]+` with `sk-****`
- Each decision logged as PermissionEvent

---

## Group 3: Wiring + Tests (parallel)

### T-04: Create public API
| | |
|---|---|
| **Dependencies** | T-03, 001-config |
| **Verification** | Exports factory function |

Create `src/permissions/index.ts`:
- `createPermissionSystem(config: Config, promptFn: PromptFn)`
- Reads `permissions.autoApprove`, `permissions.deny`, `permissions.askTimeout` from config
- Returns `{ checkPermission }`

### T-05: Unit tests — blacklist
| | |
|---|---|
| **Dependencies** | T-01 |
Create `tests/permissions/blacklist.test.ts`:
- All patterns are non-empty
- All patterns contain `:` separator
- No duplicate patterns

### T-06: Unit tests — matcher
| | |
|---|---|
| **Dependencies** | T-02 |
Create `tests/permissions/matcher.test.ts`:
- Exact: `Read:src/file.ts` matches `Read("src/file.ts")`
- Wildcard tool: `*:*` matches everything
- Wildcard args: `Bash:git *` matches `Bash("git commit")`
- No match: `Bash:rm *` doesn't match `Bash("git status")`
- Empty pattern → false
- Regex special chars in args → escaped correctly

### T-07: Unit tests — checker
| | |
|---|---|
| **Dependencies** | T-03 |
Create `tests/permissions/checker.test.ts`:
- autoApprove matched → approved without prompt
- deny matched → denied without prompt
- deny wins over autoApprove
- blacklist matched → forced ask (promptFn called)
- Neither → ask (promptFn called)
- promptFn returns "always" → pattern added to autoApprove
- Timeout → denied
- API key redacted in log

### T-08: Integration test — wired to scheduler
| | |
|---|---|
| **Dependencies** | T-04 |
Create `tests/permissions/integration.test.ts`:
- Create checker with mock config + mock promptFn
- Wire to scheduler
- Verify tool with autoApprove → executes
- Verify tool with deny → returns error result

### T-09: Update 002 stub + re-run tests
| | |
|---|---|
| **Dependencies** | T-04 |
Replace `src/runtime/stubs/permission.ts` with real permission system. Re-run 002 integration tests.
