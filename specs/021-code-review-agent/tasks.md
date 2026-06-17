# Tasks: Code Review Agent

| # | Task | Label | Dependencies | Verification |
|---|------|-------|--------------|--------------|
| T001 | ✅ Create `src/review/types.ts` with review domain contracts | [BE] | — | `pnpm test -- tests/review/contract.test.ts` |
| T002 | ✅ Add contract snapshot for `ReviewResult` and categories | [BE] | T001 | `pnpm test -- tests/review/contract.test.ts` |
| T003 | ✅ Implement `ReviewInputBuilder` skeleton | [BE] | T001 | `pnpm test -- tests/review/input-builder.test.ts` |
| T004 | ✅ Include task intent in review input | [BE] | T003 | `pnpm test -- tests/review/input-builder.test.ts` |
| T005 | ✅ Include changed file list and diff text in review input | [BE] | T003 | `pnpm test -- tests/review/input-builder.test.ts` |
| T006 | ✅ Include test output in review input | [BE] | T003 | `pnpm test -- tests/review/input-builder.test.ts` |
| T007 | ✅ Include tool failures in review input | [BE] | T003 | `pnpm test -- tests/review/input-builder.test.ts` |
| T008 | ✅ Add test proving full transcript is excluded | [BE] | T003 | `pnpm test -- tests/review/input-builder.test.ts` |
| T009 | ✅ Add diff truncation with visible note | [BE] | T005 | `pnpm test -- tests/review/input-builder.test.ts` |
| T010 | ✅ Implement review prompt builder | [BE] | T001 | `pnpm test -- tests/review/prompt.test.ts` |
| T011 | ✅ Snapshot review prompt | [BE] | T010 | `pnpm test -- tests/review/prompt.test.ts` |
| T012 | ✅ Implement JSON review parser for approved result | [BE] | T001 | `pnpm test -- tests/review/parser.test.ts` |
| T013 | ✅ Implement JSON review parser for blocking findings | [BE] | T012 | `pnpm test -- tests/review/parser.test.ts` |
| T014 | ✅ Treat empty output as inconclusive blocking result | [BE] | T012 | `pnpm test -- tests/review/parser.test.ts` |
| T015 | ✅ Treat malformed output as inconclusive blocking result | [BE] | T012 | `pnpm test -- tests/review/parser.test.ts` |
| T016 | ✅ Add fallback text parser for simple finding lists | [BE] | T012 | `pnpm test -- tests/review/parser.test.ts` |
| T017 | ✅ Implement `runCodeReview()` with fake provider boundary | [BE] | T010,T012 | `pnpm test -- tests/review/reviewer.test.ts` |
| T018 | ✅ Add reviewer test for approved response | [BE] | T017 | `pnpm test -- tests/review/reviewer.test.ts` |
| T019 | ✅ Add reviewer test for blocking findings | [BE] | T017 | `pnpm test -- tests/review/reviewer.test.ts` |
| T020 | ✅ Add reviewer test for malformed provider output | [BE] | T017 | `pnpm test -- tests/review/reviewer.test.ts` |
| T021 | Add observability event names for review start/end | [BE] | T017 | `pnpm test -- tests/observability` |
| T022 | Render review findings table in CLI helper | [FE] | T001 | `pnpm test -- tests/cli` |
| T023 | Add public export from `src/review/index.ts` | [BE] | T017 | `pnpm test -- tests/review` |
| T024 | Add 020 integration adapter for Review phase | [INT] | T017 | `pnpm test -- tests/agents tests/review` |
| T025 | Add synthetic diff fixture with known defect | [BE] | T017 | `pnpm test -- tests/review/reviewer.test.ts` |
| T026 | Add failed-test-output blocking test | [BE] | T017 | `pnpm test -- tests/review/reviewer.test.ts` |
| T027 | ✅ Run focused review test suite | [INT] | T001-T026 | `pnpm test -- tests/review` |
| T028 | Update closeout docs `state.md` and `session.md` | [INT] | T027 | Review docs |
