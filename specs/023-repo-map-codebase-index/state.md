# State: 023 Repo Map / Codebase Index

Status: Completed
Date: 2026-06-17
Tag: v0.1.0-023-repo-map-codebase-index

## Final Verification

| Gate | Command | Result |
|------|---------|--------|
| T039 Focused suite | `pnpm test -- tests/repo-map tests/runtime/repo-map-integration.test.ts tests/agents tests/planning` | 293/293 PASSED across 36 files |
| Typecheck | `pnpm typecheck` | PASSED |
| Full suite | `pnpm test` | All repo-map tests green |

## Completed Scope

- **`src/repo-map/types.ts`** — Domain contracts: `RepoMap`, `IndexedFile`, `CodeSymbol`, `RepoMapQuery`, `RepoMapResult`, `RepoMapDiagnostic` with Zod v4 schemas and `create*()` factories
- **`src/repo-map/ignore.ts`** — Built-in skip rules for `node_modules`, `.git`, build output, binary files, oversized files, secrets (`.env`, credentials)
- **`src/repo-map/collector.ts`** — Deterministic file collector with alphanumeric sort, max file count, max file bytes
- **`src/repo-map/extractor.ts`** — TS/JS import/export extraction, top-level function/class/const/type/interface symbols, generic text fallback
- **`src/repo-map/builder.ts`** — RepoMap builder combining indexed files, import graph, symbol table, and diagnostics
- **`src/repo-map/search.ts`** — Deterministic ranked search by exact symbol, basename, import, path, and summary match
- **`src/repo-map/render.ts`** — Compact repo-map context block with character budget enforcement
- **`src/repo-map/refresh.ts`** — Incremental update for changed, added, and deleted files
- **`src/repo-map/query.ts`** — One-shot convenience function (collect + build + search) for agents/planner
- **`src/repo-map/index.ts`** — Public barrel exports
- **Config integration** — `repoMap` settings in `defaults.ts`, `validator.ts`, `env-parser.ts` (`enabled`, `maxFiles`, `maxFileBytes`, `promptBudget`)
- **Runtime integration** — Repo-map built once per session, injected as Layer 1.5 in composePrompt, persisted via `SessionState.repoMapFileCount`/`repoMapDiagnosticCount`
- **Observability integration** — `repomap:build_end` event, `StatsCollector` extended with repo-map fields
- **Agent/Planner stubs** — `queryRepoMap` integration point for Explore role (020) and Plan Mode (022)

## Modules

| Module | Files | Tests |
|--------|-------|-------|
| types | 1 | contract snapshot |
| ignore | 1 | 5 tests |
| collector | 1 | 3 tests |
| extractor | 1 | 6 tests |
| builder | 1 | 4 tests |
| search | 1 | 4 tests |
| render | 1 | 3 tests |
| refresh | 1 | 3 tests |
| query | 1 | 4 tests |
| barrel | 1 | — |
| config | 3 | 2 test files |
| runtime | 2 | 1 test file (6 tests) |
| observability | 2 | 1 test file |
| persistence | 1 | — |
| **Total** | **18 source files** | **36 test files / 293 tests** |

## Architecture

```
Workspace root
  → File collector (deterministic sort, max files/bytes)
    → Ignore filters (node_modules, .git, binary, secrets, oversized)
      → Bounded file reader
        → Symbol extractor (TS/JS imports, exports, symbols + generic fallback)
          → RepoMap builder (files + symbol table + import graph + diagnostics)
            → Renderer (bounded context block)
              → Runtime prompt (Layer 1.5)
            → Search (ranked results)
              → queryRepoMap → Explore / Planner
            → Refresh (incremental add/change/delete)
```
