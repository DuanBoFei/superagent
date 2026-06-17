# Tasks: Repo Map / Codebase Index

| # | Task | Label | Dependencies | Verification |
|---|------|-------|--------------|--------------|
| T001 | Create `src/repo-map/types.ts` with repo-map contracts | [BE] | — | `pnpm test -- tests/repo-map/contract.test.ts` |
| T002 | Add contract snapshot for repo-map shapes | [BE] | T001 | `pnpm test -- tests/repo-map/contract.test.ts` |
| T003 | Implement built-in ignored path patterns | [BE] | T001 | `pnpm test -- tests/repo-map/ignore.test.ts` |
| T004 | Add ignore tests for dependency and build directories | [BE] | T003 | `pnpm test -- tests/repo-map/ignore.test.ts` |
| T005 | Add ignore tests for likely secret files | [BE] | T003 | `pnpm test -- tests/repo-map/ignore.test.ts` |
| T006 | Add oversized file skip decision | [BE] | T003 | `pnpm test -- tests/repo-map/ignore.test.ts` |
| T007 | Add binary file skip decision | [BE] | T003 | `pnpm test -- tests/repo-map/ignore.test.ts` |
| T008 | Implement deterministic file collector | [BE] | T003 | `pnpm test -- tests/repo-map/collector.test.ts` |
| T009 | Enforce max indexed file count | [BE] | T008 | `pnpm test -- tests/repo-map/collector.test.ts` |
| T010 | Add collector diagnostic for skipped candidates | [BE] | T008,T009 | `pnpm test -- tests/repo-map/collector.test.ts` |
| T011 | Implement TS/JS import extraction | [BE] | T001 | `pnpm test -- tests/repo-map/extractor.test.ts` |
| T012 | Implement TS/JS export extraction | [BE] | T011 | `pnpm test -- tests/repo-map/extractor.test.ts` |
| T013 | Extract top-level function symbols | [BE] | T011 | `pnpm test -- tests/repo-map/extractor.test.ts` |
| T014 | Extract top-level class symbols | [BE] | T011 | `pnpm test -- tests/repo-map/extractor.test.ts` |
| T015 | Extract top-level const/type/interface symbols | [BE] | T011 | `pnpm test -- tests/repo-map/extractor.test.ts` |
| T016 | Add generic text fallback extractor | [BE] | T001 | `pnpm test -- tests/repo-map/extractor.test.ts` |
| T017 | Implement `RepoMap` builder | [BE] | T008,T011-T016 | `pnpm test -- tests/repo-map/builder.test.ts` |
| T018 | Aggregate file diagnostics in builder | [BE] | T017 | `pnpm test -- tests/repo-map/builder.test.ts` |
| T019 | Build symbol table from indexed files | [BE] | T017 | `pnpm test -- tests/repo-map/builder.test.ts` |
| T020 | Build import graph from indexed files | [BE] | T017 | `pnpm test -- tests/repo-map/builder.test.ts` |
| T021 | Implement exact symbol ranking | [BE] | T019 | `pnpm test -- tests/repo-map/search.test.ts` |
| T022 | Implement basename and path ranking | [BE] | T021 | `pnpm test -- tests/repo-map/search.test.ts` |
| T023 | Implement import and summary ranking | [BE] | T022 | `pnpm test -- tests/repo-map/search.test.ts` |
| T024 | Return empty result without fabricated paths | [BE] | T021-T023 | `pnpm test -- tests/repo-map/search.test.ts` |
| T025 | Render compact repo-map context block | [BE] | T017,T021-T024 | `pnpm test -- tests/repo-map/render.test.ts` |
| T026 | Enforce render character budget | [BE] | T025 | `pnpm test -- tests/repo-map/render.test.ts` |
| T027 | Snapshot rendered repo-map context | [BE] | T025,T026 | `pnpm test -- tests/repo-map/render.test.ts` |
| T028 | Implement changed-file refresh | [BE] | T017 | `pnpm test -- tests/repo-map/refresh.test.ts` |
| T029 | Implement added-file refresh | [BE] | T028 | `pnpm test -- tests/repo-map/refresh.test.ts` |
| T030 | Implement deleted-file refresh | [BE] | T028 | `pnpm test -- tests/repo-map/refresh.test.ts` |
| T031 | Add public exports from `src/repo-map/index.ts` | [BE] | T001-T030 | `pnpm test -- tests/repo-map` |
| T032 | Add repo-map settings defaults | [INT] | T003,T025 | `pnpm test -- tests/config` |
| T033 | Wire repo-map build into runtime context setup | [INT] | T017,T025,T032 | `pnpm test -- tests/runtime/repo-map-integration.test.ts` |
| T034 | Inject bounded repo-map block into prompts | [INT] | T025,T033 | `pnpm test -- tests/runtime/repo-map-integration.test.ts` |
| T035 | Persist repo-map metadata and diagnostics | [INT] | T017,T032 | `pnpm test -- tests/persistence tests/repo-map` |
| T036 | Emit repo-map observability events | [INT] | T017,T028 | `pnpm test -- tests/observability tests/repo-map` |
| T037 | Provide repo-map context to 020 Explore role | [INT] | T025,T031 | `pnpm test -- tests/agents tests/repo-map` |
| T038 | Provide repo-map context to 022 planner prompt | [INT] | T025,T031 | `pnpm test -- tests/planning tests/repo-map` |
| T039 | Run focused repo-map suite | [INT] | T001-T038 | `pnpm test -- tests/repo-map tests/runtime/repo-map-integration.test.ts` |
| T040 | Update closeout docs `state.md` and `session.md` | [INT] | T039 | Review docs |
