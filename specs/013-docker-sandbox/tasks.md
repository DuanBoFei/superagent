# Tasks: Docker Sandbox

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

Write sandbox configuration and permission-order contract tests before implementation.

- [ ] T001 [BE] Add sandbox config contract tests in tests/config/sandbox-config.test.ts

| | |
|---|---|
| **Source** | FR-SBX-01; Contract `sandbox-config.md` validation rules |
| **Dependencies** | None |
| **Verification** | `pnpm test -- tests/config/sandbox-config.test.ts` initially fails for missing sandbox config support, then passes after T006 |

Create failing tests for:
- omitted `sandbox` defaults to disabled
- `enabled: false` preserves config but does not route execution
- enabled sandbox without image fails validation
- unknown type/network/pullPolicy fails validation
- invalid timeout/workspace mount path fails validation
- secret-like env values are accepted but redacted in diagnostics

---

## Phase 2: Foundational Types & Unit Tests

### Goal

Define typed sandbox contracts and red tests for profile resolution, safe errors, and Docker availability.

- [ ] T002 [P] [BE] Define sandbox domain types in src/sandbox/types.ts and tests/sandbox/types.test.ts

| | |
|---|---|
| **Source** | FR-SBX-01, FR-SBX-08; Data Model §Sandbox Config/Profile/Execution/Result |
| **Dependencies** | None |
| **Verification** | `pnpm typecheck`; `pnpm test -- tests/sandbox/types.test.ts` |

Define typed shapes for:
- `SandboxConfig`
- `SandboxProfile`
- `SandboxAvailability`
- `SandboxExecution`
- `SandboxResult`
- sandbox lifecycle status values

- [ ] T003 [P] [BE] Add sandbox profile resolution tests in tests/sandbox/config.test.ts and src/sandbox/config.ts

| | |
|---|---|
| **Source** | FR-SBX-01, FR-SBX-04, FR-SBX-05, FR-SBX-06; AC-SBX-03 |
| **Dependencies** | T002 |
| **Verification** | `pnpm test -- tests/sandbox/config.test.ts` |

Test and implement profile resolution for:
- workspace host path to deterministic container path
- workspace paths containing spaces
- network disabled by default
- env allowlist only
- explicit env merged after allowlist
- memory/CPU/timeout defaults

- [ ] T004 [P] [BE] Add sandbox error and redaction tests in tests/sandbox/errors.test.ts and src/sandbox/errors.ts

| | |
|---|---|
| **Source** | FR-SBX-09, FR-SBX-10; Boundary Conditions: Docker unavailable, image failure, timeout, secret-like values |
| **Dependencies** | T002 |
| **Verification** | `pnpm test -- tests/sandbox/errors.test.ts` |

Test and implement safe normalization for:
- Docker unavailable
- image unavailable/pull failure
- container startup failure
- timeout
- oversized stdout/stderr truncation
- secret-like env/output redaction

- [ ] T005 [P] [BE] Add Docker availability tests in tests/sandbox/availability.test.ts and src/sandbox/availability.ts

| | |
|---|---|
| **Source** | FR-SBX-09, FR-SBX-12; AC-SBX-04; Research Decision 4 |
| **Dependencies** | T002, T004 |
| **Verification** | `pnpm test -- tests/sandbox/availability.test.ts` |

Cover:
- Docker CLI/daemon unavailable
- image exists locally
- image missing with `pullPolicy: never`
- image missing with explicit pull policy
- pull failure becomes safe availability result

---

## Phase 3: User Story 1 — Configure and Run Sandboxed Commands

### Goal

A developer can enable Docker sandbox mode and run an approved command inside a container.

### Independent Test Criteria

A fake Docker adapter receives a command with workspace mount, workdir, env allowlist, network, and resource args, then returns a Bash-compatible result.

- [ ] T006 [BE] [US1] Implement sandbox config schema and defaults in src/config/types.ts, src/config/defaults.ts, and src/config/validator.ts

| | |
|---|---|
| **Source** | FR-SBX-01; Contract validation rules |
| **Dependencies** | T001, T002 |
| **Verification** | `pnpm test -- tests/config/sandbox-config.test.ts`; `pnpm typecheck` |

Add `sandbox` config with:
- default disabled config
- Docker-only `type`
- image requirement when enabled
- workspace/network/pullPolicy/timeout/resource validation
- env redaction support in diagnostics

- [ ] T007 [BE] [US1] Implement Docker CLI adapter abstraction in src/sandbox/docker-cli.ts

| | |
|---|---|
| **Source** | FR-SBX-03, FR-SBX-08; Plan §Docker Command Contract |
| **Dependencies** | T002 |
| **Verification** | `pnpm test -- tests/sandbox/executor.test.ts` with fake adapter |

Create an adapter boundary for:
- checking Docker availability
- checking/pulling image if configured
- running Docker command with args
- capturing stdout/stderr/exit code
- allowing tests to inject fake Docker behavior without daemon dependency

- [ ] T008 [BE] [US1] Implement sandbox executor in src/sandbox/executor.ts and src/sandbox/index.ts

| | |
|---|---|
| **Source** | FR-SBX-03, FR-SBX-04, FR-SBX-05, FR-SBX-06, FR-SBX-07, FR-SBX-08; AC-SBX-01, AC-SBX-03, AC-SBX-05 |
| **Dependencies** | T003, T004, T005, T007 |
| **Verification** | `pnpm test -- tests/sandbox/executor.test.ts` |

Implement:
- build Docker run semantics from resolved profile
- workspace mount and workdir
- network disabled/enabled handling
- env allowlist and explicit env
- memory/CPU resource flags
- timeout and process termination
- normalized execution result

- [ ] T009 [BE] [US1] Implement sandbox result normalization in src/sandbox/results.ts

| | |
|---|---|
| **Source** | FR-SBX-08, FR-SBX-09; AC-SBX-01, AC-SBX-04, AC-SBX-05 |
| **Dependencies** | T004, T008 |
| **Verification** | `pnpm test -- tests/sandbox/results.test.ts` |

Normalize:
- successful command output
- non-zero command exit
- Docker setup failures
- startup failures
- timed-out executions
- redacted/truncated stdout/stderr

---

## Phase 4: User Story 2 — Preserve Permission Boundaries

### Goal

Sandbox mode never bypasses existing permission and dangerous-command policy.

### Independent Test Criteria

A denied Bash command does not start the sandbox executor; an allowed command does.

- [ ] T010 [INT] [US2] Add sandbox permission-order tests in tests/runtime/sandbox-permissions.test.ts

| | |
|---|---|
| **Source** | FR-SBX-02; AC-SBX-02; Research Decision 2 |
| **Dependencies** | T006, T008 |
| **Verification** | `pnpm test -- tests/runtime/sandbox-permissions.test.ts` initially fails, then passes after T011 |

Test:
- deny prevents sandbox executor call
- ask requires approval before sandbox executor call
- allow routes to sandbox executor when enabled
- dangerous command policy remains authoritative

- [ ] T011 [INT] [US2] Route Bash execution through sandbox after permission approval in src/tools/bash.ts and src/runtime/tool-dispatcher.ts

| | |
|---|---|
| **Source** | FR-SBX-02, FR-SBX-03, FR-SBX-12; AC-SBX-01, AC-SBX-02, AC-SBX-04 |
| **Dependencies** | T008, T009, T010 |
| **Verification** | `pnpm test -- tests/runtime/sandbox-permissions.test.ts`; existing Bash/tool tests still pass |

Wire behavior:
- sandbox disabled keeps existing host Bash execution
- sandbox enabled routes approved Bash commands to sandbox executor
- denied/blocked commands never start Docker
- Docker setup failure returns safe tool result and session continues

---

## Phase 5: User Story 3 — Failure Isolation and Observability

### Goal

Sandbox failures are diagnosable through observability and do not crash the Agent session.

### Independent Test Criteria

Docker unavailable, command timeout, and command non-zero exit produce safe results and redacted sandbox lifecycle events.

- [ ] T012 [INT] [US3] Add sandbox observability event types in src/observability/types.ts

| | |
|---|---|
| **Source** | FR-SBX-10, FR-SBX-11; AC-SBX-04, AC-SBX-05; Plan §Observability Events |
| **Dependencies** | T004, T009 |
| **Verification** | `pnpm test -- tests/sandbox/integration.test.ts tests/observability`; redaction assertions pass |

Add events:
- `sandbox:start`
- `sandbox:end`
- `sandbox:failure`

Fields include executionId, image, workspaceMount, network, commandSummary, duration, success, timedOut, and safeError.

- [ ] T013 [INT] [US3] Emit sandbox lifecycle events from src/sandbox/executor.ts

| | |
|---|---|
| **Source** | FR-SBX-09, FR-SBX-10, FR-SBX-11; AC-SBX-04, AC-SBX-05 |
| **Dependencies** | T008, T009, T012 |
| **Verification** | `pnpm test -- tests/sandbox/integration.test.ts` |

Emit:
- start before Docker execution
- end on command completion, including non-zero exit
- failure on Docker unavailable/startup/image/timeout failures
- redacted command/env/output summaries

- [ ] T014 [INT] [US3] Add end-to-end sandbox integration coverage in tests/sandbox/integration.test.ts

| | |
|---|---|
| **Source** | AC-SBX-01, AC-SBX-02, AC-SBX-03, AC-SBX-04, AC-SBX-05; SC-SBX-01 through SC-SBX-05 |
| **Dependencies** | T011, T012, T013 |
| **Verification** | `pnpm test -- tests/sandbox/integration.test.ts`; optional Docker smoke skipped when Docker unavailable |

End-to-end coverage must verify:
- approved command routes to fake Docker sandbox
- permission deny prevents sandbox startup
- workspace mount semantics are represented in Docker adapter call
- Docker unavailable returns safe result and session continues
- timeout returns `timedOut: true`
- secret-like env/output is redacted in logs and result summaries

---

## Dependencies

```text
T001 ── T006 ─┐
T002 ─┬─ T003 ├─ T008 ─ T009 ─ T011 ─ T014
      ├─ T004 ┤   │      └─ T012 ─ T013 ─┘
      └─ T005 ┘   └─ T010 ───────────────┘
T007 ─────────────┘
```

## Parallel Execution Examples

### After T001/T002 baseline

```text
Parallel group A:
- T003 profile resolution
- T004 safe errors/redaction
- T005 availability checks
- T007 Docker adapter boundary
```

### After executor exists

```text
Parallel group B:
- T009 result normalization
- T010 permission-order tests
- T012 observability type extension
```

## Implementation Strategy

1. **Contract first**: T001-T005 define config, types, profile, availability, and safe errors before execution code.
2. **MVP path**: T006-T011 delivers Docker config, executor, Bash routing, and permission-preserving behavior.
3. **Hardening path**: T012-T014 adds observability, failure isolation, redaction, and end-to-end coverage.
4. **Stop point**: Do not implement cloud sandboxes, OS-native sandboxes, MCP server sandboxing, or Playwright browser behavior in this feature.
