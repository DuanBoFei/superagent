# Tasks: Hooks Lifecycle System

## Task Summary

14 tasks · TDD-first · 4 user-story phases · estimated 2-3 days

All tasks include:
- `[BE]` backend/module work
- `[INT]` integration/runtime flow work
- Source: FR/AC references from `spec.md`
- Dependencies: prerequisite task IDs
- Verification: concrete test or command

---

## Phase 1: Setup & Contracts

### Goal

Write config and lifecycle contract tests before implementation.

- [x] T001 [BE] Add hooks config contract tests in tests/config/hooks-config.test.ts

| | |
|---|---|
| **Source** | FR-HOOK-01, FR-HOOK-02, FR-HOOK-03; Contract `hooks-config.md` validation rules |
| **Dependencies** | None |
| **Verification** | `pnpm test -- tests/config/hooks-config.test.ts` initially fails for missing hooks config support, then passes after T006 |

Create failing tests for:
- omitted `hooks` starts with empty config
- unknown event name fails validation
- enabled hook without `command` fails validation
- disabled hook without command is allowed but not executable
- `timeoutMs <= 0` fails validation
- `blocking: true` on observe-only event fails validation
- multiple hooks on one event preserve array order

---

## Phase 2: Foundational Types & Unit Tests

### Goal

Define typed hook contracts and red tests for matching, execution, and safe errors before runtime wiring.

- [x] T002 [P] [BE] Define hook domain types in src/hooks/types.ts and tests/hooks/types.test.ts

| | |
|---|---|
| **Source** | FR-HOOK-03, FR-HOOK-04, FR-HOOK-05, FR-HOOK-06; Data Model §Hook Config/Event/Execution/Result |
| **Dependencies** | None |
| **Verification** | `pnpm typecheck`; `pnpm test -- tests/hooks/types.test.ts` |

Define typed shapes for:
- hook events and event payloads
- `HookConfig`, `HookMatcher`, `HookExecution`, `HookResult`
- result decisions `continue` and `block`
- observe-only vs blocking event classification

- [x] T003 [P] [BE] Add hook lifecycle event builders in src/hooks/events.ts and tests/hooks/events.test.ts

| | |
|---|---|
| **Source** | FR-HOOK-04, FR-HOOK-05; AC-HOOK-01, AC-HOOK-04 |
| **Dependencies** | T002 |
| **Verification** | `pnpm test -- tests/hooks/events.test.ts` |

Test and implement builders for:
- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `PostToolUseFailure`
- `PreCompact`
- `Stop`

- [ ] T004 [P] [BE] Add hook matcher tests in tests/hooks/matcher.test.ts and src/hooks/matcher.ts

| | |
|---|---|
| **Source** | FR-HOOK-09; AC-HOOK-03; Data Model §Hook Matcher |
| **Dependencies** | T002, T003 |
| **Verification** | `pnpm test -- tests/hooks/matcher.test.ts` |

Cover:
- event name matching
- tool matcher `*`, one built-in tool, one MCP-style tool identity
- `inputPattern` matching serialized tool input
- `promptPattern` matching submitted prompt text
- no matcher means hook applies to its event

- [ ] T005 [P] [BE] Add hook error redaction tests in tests/hooks/errors.test.ts and src/hooks/errors.ts

| | |
|---|---|
| **Source** | FR-HOOK-10, FR-HOOK-11, FR-HOOK-12; Boundary Conditions: invalid JSON, timeout, command missing, secret-like data |
| **Dependencies** | T002 |
| **Verification** | `pnpm test -- tests/hooks/errors.test.ts` |

Test and implement safe normalization for:
- command not found
- non-zero exit
- timeout
- invalid JSON output
- oversized stdout/stderr truncation
- secret-like value redaction

---

## Phase 3: User Story 1 — Configure and Run Session Hooks

### Goal

A maintainer can configure local command hooks and run a SessionStart hook safely.

### Independent Test Criteria

A local fake SessionStart command receives JSON stdin, returns continue, and emits hook observability without blocking startup.

- [ ] T006 [BE] [US1] Implement hooks config schema and defaults in src/config/types.ts, src/config/defaults.ts, and src/config/validator.ts

| | |
|---|---|
| **Source** | FR-HOOK-01, FR-HOOK-02, FR-HOOK-03; AC-HOOK-01; Contract validation rules |
| **Dependencies** | T001, T002 |
| **Verification** | `pnpm test -- tests/config/hooks-config.test.ts`; `pnpm typecheck` |

Add `hooks` config with:
- default empty hook map
- supported event validation
- local command hook validation
- default timeout
- disabled hook preservation
- blocking-event validation

- [ ] T007 [BE] [US1] Implement local command hook executor in src/hooks/executor.ts

| | |
|---|---|
| **Source** | FR-HOOK-05, FR-HOOK-06, FR-HOOK-10, FR-HOOK-12; AC-HOOK-01, AC-HOOK-05 |
| **Dependencies** | T003, T005, T006 |
| **Verification** | `pnpm test -- tests/hooks/executor.test.ts` |

Implement:
- spawn command with args/env
- send JSON hook event through stdin
- parse stdout JSON result when present
- capture redacted stdout/stderr summaries
- enforce timeout and terminate process
- normalize execution result without throwing on command failure

- [ ] T008 [BE] [US1] Implement hook manager ordered dispatch in src/hooks/manager.ts and src/hooks/index.ts

| | |
|---|---|
| **Source** | FR-HOOK-01, FR-HOOK-04, FR-HOOK-06, FR-HOOK-08, FR-HOOK-11; AC-HOOK-01, AC-HOOK-05 |
| **Dependencies** | T004, T007 |
| **Verification** | `pnpm test -- tests/hooks/manager.test.ts` |

Implement:
- collect enabled hooks by event
- run hooks sequentially in config order
- ignore disabled hooks
- apply matcher before execution
- normalize observe-only `block` as hook failure while continuing flow
- expose public `createHookManager()` API

---

## Phase 4: User Story 2 — Block User Prompts

### Goal

A UserPromptSubmit hook can block a prompt before a model request is made.

### Independent Test Criteria

A fake policy hook blocks a prompt containing a forbidden pattern, and the runtime emits no model request for that prompt.

- [ ] T009 [INT] [US2] Wire UserPromptSubmit hooks into src/runtime/query-loop.ts

| | |
|---|---|
| **Source** | FR-HOOK-04, FR-HOOK-07; AC-HOOK-02; SC-HOOK-02 |
| **Dependencies** | T008 |
| **Verification** | `pnpm test -- tests/runtime/hooks-prompt.test.ts` |

Wire prompt flow so:
- hook fires immediately after user prompt submission
- blocking result prevents model call
- safe hook message is shown to the user
- continue result preserves normal model flow
- hook failure follows blocking/observe-only contract

---

## Phase 5: User Story 3 — Block and Observe Tool Execution

### Goal

PreToolUse can block matching tool calls, while PostToolUse observes completed results without mutation.

### Independent Test Criteria

A fake Bash policy hook blocks `git push`; a PostToolUse hook runs after a safe tool and cannot alter its result.

- [ ] T010 [INT] [US3] Wire PreToolUse blocking hooks into src/runtime/tool-dispatcher.ts

| | |
|---|---|
| **Source** | FR-HOOK-04, FR-HOOK-07, FR-HOOK-09; AC-HOOK-03; SC-HOOK-03 |
| **Dependencies** | T004, T008 |
| **Verification** | `pnpm test -- tests/runtime/hooks-tool-dispatch.test.ts` |

Implement:
- fire PreToolUse before tool execution
- include tool name, input summary, and permission key when available
- block matching tool call before side effects
- return safe blocked tool result to Agent
- preserve existing dangerous command deny behavior

- [ ] T011 [INT] [US3] Wire PostToolUse and PostToolUseFailure observe-only hooks in src/runtime/tool-dispatcher.ts

| | |
|---|---|
| **Source** | FR-HOOK-04, FR-HOOK-08, FR-HOOK-11; AC-HOOK-04, AC-HOOK-05 |
| **Dependencies** | T008, T010 |
| **Verification** | `pnpm test -- tests/runtime/hooks-tool-dispatch.test.ts` |

Implement:
- PostToolUse fires after successful tool completion
- PostToolUseFailure fires after tool failure
- original tool result/error is unchanged by hook output
- failed observe-only hooks are recorded but do not alter runtime flow

---

## Phase 6: User Story 4 — Session Lifecycle, Compaction, and Observability

### Goal

Hooks run at remaining lifecycle points and emit redacted observability events.

### Independent Test Criteria

SessionStart, PreCompact, and Stop hooks emit hook lifecycle events, and failures/timeouts are logged safely without preventing shutdown or compaction.

- [ ] T012 [INT] [US4] Wire SessionStart, PreCompact, and Stop hooks into src/runtime/runtime.ts and src/runtime/query-loop.ts

| | |
|---|---|
| **Source** | FR-HOOK-04, FR-HOOK-08, FR-HOOK-11; AC-HOOK-01, AC-HOOK-05 |
| **Dependencies** | T008, T009, T011 |
| **Verification** | `pnpm test -- tests/hooks/integration.test.ts` |

Wire:
- SessionStart during runtime startup
- PreCompact before context compaction starts
- Stop during session shutdown
- observe-only failures never block startup, compaction, or shutdown

- [ ] T013 [INT] [US4] Add hook observability event types and emission in src/observability/types.ts

| | |
|---|---|
| **Source** | FR-HOOK-12, FR-HOOK-13; AC-HOOK-05; Plan §Observability Events |
| **Dependencies** | T005, T008, T012 |
| **Verification** | `pnpm test -- tests/hooks/integration.test.ts tests/observability`; redaction assertions pass |

Add and verify events:
- `hook:start`
- `hook:end`
- `hook:failure`
- `hook:block`

Fields must include hook name, hook event, duration, exit status when available, decision, and redacted diagnostics.

- [ ] T014 [INT] [US4] Add end-to-end hook lifecycle coverage in tests/hooks/integration.test.ts

| | |
|---|---|
| **Source** | AC-HOOK-01, AC-HOOK-02, AC-HOOK-03, AC-HOOK-04, AC-HOOK-05; SC-HOOK-01 through SC-HOOK-05 |
| **Dependencies** | T009, T010, T011, T012, T013 |
| **Verification** | `pnpm test -- tests/hooks/integration.test.ts`; `pnpm test -- tests/runtime/hooks-prompt.test.ts tests/runtime/hooks-tool-dispatch.test.ts` |

End-to-end coverage must verify:
- SessionStart hook succeeds
- UserPromptSubmit blocks before model request
- PreToolUse blocks before tool execution
- PostToolUse observe-only cannot mutate result
- timeout/non-zero hook failure is isolated
- secret-like stdout/stderr is redacted in logs and terminal-facing summaries

---

## Dependencies

```text
T001 ── T006 ─┐
T002 ─┬─ T003 ├─ T007 ─ T008 ─ T009 ─┐
      ├─ T004 ┘          └─ T010 ─ T011 ─ T012 ─ T013 ─ T014
      └─ T005 ────────────────────────┘
```

## Parallel Execution Examples

### After T001/T002 baseline

```text
Parallel group A:
- T003 lifecycle event builders
- T004 matcher tests/helpers
- T005 error redaction helpers
```

### After hook manager exists

```text
Parallel group B:
- T009 prompt hook runtime wiring
- T010 PreToolUse dispatcher wiring
```

## Implementation Strategy

1. **Contract first**: T001-T005 create failing tests and typed boundaries before runtime code.
2. **MVP path**: T006-T010 delivers config, local command execution, ordered dispatch, and pre-action blocking.
3. **Hardening path**: T011-T014 adds observe-only lifecycle coverage, compaction/shutdown hooks, observability, failure isolation, and redaction.
4. **Stop point**: Do not implement HTTP hooks, prompt/LLM evaluator hooks, agent hooks, marketplaces, or hidden mutation of model messages/tool results in this feature.
