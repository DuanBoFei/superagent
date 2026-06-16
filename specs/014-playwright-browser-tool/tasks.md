# Tasks: Playwright Browser Tool

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

Write browser configuration and permission-order contract tests before implementation.

- [x] T001 [BE] Add browser config contract tests in tests/config/browser-config.test.ts

| | |
|---|---|
| **Source** | FR-BRW-01, FR-BRW-02; Contract `browser-tool.md` validation rules |
| **Dependencies** | None |
| **Verification** | `pnpm test -- tests/config/browser-config.test.ts` initially fails for missing browser config support, then passes after T006 |

Create failing tests for:
- omitted `browser` defaults to disabled
- `enabled: false` preserves config but does not register browser tools
- invalid timeout fails validation
- invalid viewport fails validation
- unknown network value fails validation
- artifactDir outside allowed local path policy fails validation
- secret-like config diagnostics are redacted

---

## Phase 2: Foundational Types & Unit Tests

### Goal

Define typed browser contracts and red tests for availability, safe results, artifacts, and lifecycle state.

- [x] T002 [P] [BE] Define browser domain types in src/browser/types.ts and tests/browser/types.test.ts

| | |
|---|---|
| **Source** | FR-BRW-01, FR-BRW-07, FR-BRW-09; Data Model §Browser Config/Session/Action/Result |
| **Dependencies** | None |
| **Verification** | `pnpm typecheck`; `pnpm test -- tests/browser/types.test.ts` |

Define typed shapes for:
- `BrowserConfig`
- `BrowserAvailability`
- `BrowserSession`
- `BrowserAction`
- `BrowserArtifact`
- `BrowserResult`
- browser lifecycle status values

- [x] T003 [P] [BE] Add browser config resolution tests in tests/browser/config.test.ts and src/browser/config.ts

| | |
|---|---|
| **Source** | FR-BRW-01, FR-BRW-02; AC User Story 1 |
| **Dependencies** | T002 |
| **Verification** | `pnpm test -- tests/browser/config.test.ts` |

Test and implement runtime profile resolution for:
- headless default
- finite default timeout
- viewport defaults
- local artifact directory resolution
- screenshot capture default
- network policy default

- [x] T004 [P] [BE] Add browser availability tests in tests/browser/availability.test.ts and src/browser/availability.ts

| | |
|---|---|
| **Source** | FR-BRW-10, FR-BRW-14; AC User Story 3 |
| **Dependencies** | T002 |
| **Verification** | `pnpm test -- tests/browser/availability.test.ts` |

Cover:
- Playwright package unavailable
- browser executable unavailable
- browser ready
- setup failure returns safe availability result
- diagnostics do not expose local secrets

- [x] T005 [P] [BE] Add browser results/redaction tests in tests/browser/results.test.ts and src/browser/results.ts

| | |
|---|---|
| **Source** | FR-BRW-09, FR-BRW-11, FR-BRW-12; AC User Story 3 |
| **Dependencies** | T002 |
| **Verification** | `pnpm test -- tests/browser/results.test.ts` |

Normalize:
- successful page state
- setup failures
- navigation failures
- action failures
- timeout results
- oversized visible text/action trace truncation
- secret-like value redaction

- [x] T006 [P] [BE] Add browser artifact tests in tests/browser/artifacts.test.ts and src/browser/artifacts.ts

| | |
|---|---|
| **Source** | FR-BRW-05, FR-BRW-09, FR-BRW-10, NFR-BRW-04 |
| **Dependencies** | T002, T005 |
| **Verification** | `pnpm test -- tests/browser/artifacts.test.ts` |

Test and implement:
- local screenshot artifact metadata
- artifact path creation under configured directory
- artifact write failure safe result
- artifact label redaction
- artifact size/mime metadata

---

## Phase 3: User Story 1 — Inspect Browser Pages

### Goal

A developer can enable browser support and inspect a page from the CLI.

### Independent Test Criteria

A fake Playwright adapter receives an open request and returns normalized final URL, title, visible text summary, and screenshot artifact metadata.

- [x] T007 [BE] [US1] Implement browser config schema and defaults in src/config/types.ts, src/config/defaults.ts, and src/config/validator.ts

| | |
|---|---|
| **Source** | FR-BRW-01, FR-BRW-02; Contract validation rules |
| **Dependencies** | T001, T002 |
| **Verification** | `pnpm test -- tests/config/browser-config.test.ts`; `pnpm typecheck` |

Add `browser` config with:
- default disabled config
- headless/default timeout/viewport/artifact defaults
- network validation
- artifact path validation
- redacted diagnostics

- [ ] T008 [BE] [US1] Implement Playwright adapter boundary in src/browser/playwright-adapter.ts

| | |
|---|---|
| **Source** | FR-BRW-05, FR-BRW-06, FR-BRW-10; Plan §Browser Tool Contract |
| **Dependencies** | T002, T004 |
| **Verification** | `pnpm test -- tests/browser/actions.test.ts` with fake adapter |

Create an adapter boundary for:
- checking browser availability
- launching/closing browser context
- navigating to URL
- reading bounded page state
- taking screenshots
- allowing fake adapter injection without browser dependency

- [ ] T009 [BE] [US1] Implement browser session lifecycle in src/browser/session.ts

| | |
|---|---|
| **Source** | FR-BRW-07, FR-BRW-10, FR-BRW-15; AC User Story 1 and 3 |
| **Dependencies** | T004, T008 |
| **Verification** | `pnpm test -- tests/browser/session.test.ts` |

Implement:
- launch on first action when enabled
- reuse context for repeated actions
- close explicit action
- cleanup on session stop
- setup failure isolation
- lifecycle status transitions

- [ ] T010 [BE] [US1] Implement open/screenshot action normalization in src/browser/actions.ts and src/browser/index.ts

| | |
|---|---|
| **Source** | FR-BRW-05, FR-BRW-08, FR-BRW-09, FR-BRW-12; AC User Story 1 |
| **Dependencies** | T005, T006, T008, T009 |
| **Verification** | `pnpm test -- tests/browser/actions.test.ts` |

Implement:
- open/navigate action
- screenshot action
- final URL/title/visible text extraction through adapter
- bounded page state result
- timeout handling
- local artifact metadata integration

---

## Phase 4: User Story 2 — Interact Safely With Web UI

### Goal

Browser interactions are useful but remain permission-gated.

### Independent Test Criteria

Denied browser actions do not reach the fake Playwright adapter; approved actions do and return normalized results.

- [ ] T011 [INT] [US2] Add browser permission-order tests in tests/runtime/browser-permissions.test.ts

| | |
|---|---|
| **Source** | FR-BRW-04; AC User Story 2; Contract Permission contract |
| **Dependencies** | T007, T010 |
| **Verification** | `pnpm test -- tests/runtime/browser-permissions.test.ts` initially fails, then passes after T013 |

Test:
- deny prevents Playwright adapter call
- ask requires approval before Playwright adapter call
- allow routes to browser manager when enabled
- browser disabled does not bypass permission semantics

- [ ] T012 [BE] [US2] Implement click/type/select/wait/close actions in src/browser/actions.ts

| | |
|---|---|
| **Source** | FR-BRW-06, FR-BRW-08, FR-BRW-09, FR-BRW-11; AC User Story 2 |
| **Dependencies** | T005, T008, T009, T010 |
| **Verification** | `pnpm test -- tests/browser/actions.test.ts` |

Implement:
- click by safe target descriptor
- type with redacted text summaries
- select by safe target descriptor
- wait for selector/text/load state
- close browser context
- normalized action trace

- [ ] T013 [INT] [US2] Register browser tool and route through runtime after permission approval in src/tools/browser.ts and src/runtime/tool-dispatcher.ts

| | |
|---|---|
| **Source** | FR-BRW-03, FR-BRW-04, FR-BRW-14; AC User Story 2 |
| **Dependencies** | T011, T012 |
| **Verification** | `pnpm test -- tests/runtime/browser-permissions.test.ts`; existing tool tests still pass |

Wire behavior:
- browser disabled keeps browser tool unavailable or safe-disabled
- browser enabled routes approved actions to browser manager
- denied/blocked actions never call Playwright adapter
- setup/action failures return safe tool result and session continues

---

## Phase 5: User Story 3 — Failure Isolation and Observability

### Goal

Browser failures are diagnosable and do not crash the Agent session.

### Independent Test Criteria

Browser setup failure, timeout, action failure, and secret-like page content produce safe results and redacted browser events.

- [ ] T014 [INT] [US3] Add browser observability and integration coverage in src/observability/types.ts and tests/browser/integration.test.ts

| | |
|---|---|
| **Source** | FR-BRW-10, FR-BRW-11, FR-BRW-13, FR-BRW-14; AC User Story 3; SC-BRW-01 through SC-BRW-05 |
| **Dependencies** | T013 |
| **Verification** | `pnpm test -- tests/browser/integration.test.ts tests/observability`; optional real Playwright smoke skipped when unavailable |

Implement and verify:
- `browser:start`, `browser:action`, `browser:end`, `browser:failure` event types
- event emission from session/actions
- redacted URL/input/page/error summaries
- fake adapter end-to-end open and interaction
- setup unavailable safe result
- timeout result with `timedOut: true`
- non-browser tools remain usable after browser failure

---

## Dependencies

```text
T001 ── T007 ─┐
T002 ─┬─ T003 ├─ T008 ─ T009 ─ T010 ─ T012 ─ T013 ─ T014
      ├─ T004 ┤       │      │              └─ T011 ─┘
      ├─ T005 ┤       │      └──────────────┘
      └─ T006 ┘       └─────────────────────┘
```

## Parallel Execution Examples

### After T001/T002 baseline

```text
Parallel group A:
- T003 config resolution
- T004 availability checks
- T005 result normalization/redaction
- T006 artifact handling
```

### After browser session/action basics exist

```text
Parallel group B:
- T011 permission-order tests
- T012 interaction actions
- T014 observability event type preparation
```

## Implementation Strategy

1. **Contract first**: T001-T006 define config, types, profile, availability, results, and artifacts before runtime wiring.
2. **MVP path**: T007-T010 delivers enabled browser inspection through a fake adapter and bounded page state.
3. **Interaction path**: T011-T013 adds permission-preserving browser interactions.
4. **Hardening path**: T014 adds observability, redaction, failure isolation, and end-to-end fake adapter coverage.
5. **Stop point**: Do not implement desktop Computer Use, cloud browsers, browser-use hosted MCP, CAPTCHA/login bypass, or plugin marketplace behavior in this feature.
