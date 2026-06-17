# Tasks: Plan Mode

| # | Task | Label | Dependencies | Verification |
|---|------|-------|--------------|--------------|
| T001 | Create `src/planning/types.ts` with plan domain contracts | [BE] | — | `pnpm test -- tests/planning/contract.test.ts` |
| T002 | Add contract snapshot for `ExecutionPlan` shape | [BE] | T001 | `pnpm test -- tests/planning/contract.test.ts` |
| T003 | Implement `/plan` command detector | [BE] | T001 | `pnpm test -- tests/planning/detector.test.ts` |
| T004 | Strip `/plan` prefix while preserving original task text | [BE] | T003 | `pnpm test -- tests/planning/detector.test.ts` |
| T005 | Implement simple-task direct decision | [BE] | T003 | `pnpm test -- tests/planning/detector.test.ts` |
| T006 | Implement complex keyword auto-trigger heuristic | [BE] | T003 | `pnpm test -- tests/planning/detector.test.ts` |
| T007 | Implement risky-operation auto-trigger heuristic | [BE] | T003 | `pnpm test -- tests/planning/detector.test.ts` |
| T008 | Add detector tests for manual `/plan` | [BE] | T003 | `pnpm test -- tests/planning/detector.test.ts` |
| T009 | Add detector tests for complex auto-trigger | [BE] | T006 | `pnpm test -- tests/planning/detector.test.ts` |
| T010 | Add detector tests for simple bypass | [BE] | T005 | `pnpm test -- tests/planning/detector.test.ts` |
| T011 | Implement planner prompt builder | [BE] | T001 | `pnpm test -- tests/planning/prompt.test.ts` |
| T012 | Snapshot planner prompt | [BE] | T011 | `pnpm test -- tests/planning/prompt.test.ts` |
| T013 | Implement parser for valid JSON execution plan | [BE] | T001 | `pnpm test -- tests/planning/parser.test.ts` |
| T014 | Implement parser fallback for markdown plan sections | [BE] | T013 | `pnpm test -- tests/planning/parser.test.ts` |
| T015 | Mark malformed plan as not executable | [BE] | T013 | `pnpm test -- tests/planning/parser.test.ts` |
| T016 | Implement approval state machine | [BE] | T001 | `pnpm test -- tests/planning/approval.test.ts` |
| T017 | Add approval tests for pending → approved | [BE] | T016 | `pnpm test -- tests/planning/approval.test.ts` |
| T018 | Add approval tests for pending → rejected | [BE] | T016 | `pnpm test -- tests/planning/approval.test.ts` |
| T019 | Implement scope guard denying writes before approval | [BE] | T001 | `pnpm test -- tests/planning/scope-guard.test.ts` |
| T020 | Implement scope guard for 3+ changed file expansion | [BE] | T019 | `pnpm test -- tests/planning/scope-guard.test.ts` |
| T021 | Add scope guard tests for allowed in-scope edit | [BE] | T019 | `pnpm test -- tests/planning/scope-guard.test.ts` |
| T022 | Add scope guard tests for out-of-scope edit | [BE] | T020 | `pnpm test -- tests/planning/scope-guard.test.ts` |
| T023 | Add public exports from `src/planning/index.ts` | [BE] | T001-T022 | `pnpm test -- tests/planning` |
| T024 | Wire detector into CLI one-shot input parsing | [INT] | T003 | `pnpm test -- tests/cli` |
| T025 | Wire detector into runtime routing | [INT] | T003-T010 | `pnpm test -- tests/runtime/plan-mode-integration.test.ts` |
| T026 | Add fake planner provider test for `/plan` no-write behavior | [INT] | T011-T025 | `pnpm test -- tests/runtime/plan-mode-integration.test.ts` |
| T027 | Add approval-to-execution integration test | [INT] | T016-T025 | `pnpm test -- tests/runtime/plan-mode-integration.test.ts` |
| T028 | Add rejection no-files-changed integration test | [INT] | T016-T025 | `pnpm test -- tests/runtime/plan-mode-integration.test.ts` |
| T029 | Persist approved plan summary in session events | [INT] | T016 | `pnpm test -- tests/persistence tests/runtime/plan-mode-integration.test.ts` |
| T030 | Add 020 adapter so Implement receives approved plan | [INT] | T023 | `pnpm test -- tests/agents tests/planning` |
| T031 | Run focused planning suite | [INT] | T001-T030 | `pnpm test -- tests/planning tests/runtime/plan-mode-integration.test.ts` |
| T032 | Update closeout docs `state.md` and `session.md` | [INT] | T031 | Review docs |
