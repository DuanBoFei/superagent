# Feature 023 · Repo Map / Codebase Index — Session Notes

## Status: Complete — 40/40 tasks done

## Task Summary

| # | Group | Tasks | Commits |
|---|-------|-------|---------|
| T001-T002 | Types + contract snapshot | 2 | `eb2a90a` |
| T003-T007 | Ignore/safety filters | 5 | `304f290` |
| T008-T010 | File collector | 3 | `d49becb` |
| T011-T016 | Symbol extractor | 6 | `07ff090` |
| T017-T020 | RepoMap builder | 4 | `b2396a0` |
| T021-T024 | Search + ranking | 4 | `fac8fe1` |
| T025-T027 | Context renderer | 3 | `a33b560` |
| T028-T030 | Incremental refresh | 3 | `58c0673` |
| T031 | Barrel exports | 1 | `a2bc547` |
| T032 | Config settings | 1 | `de80781` |
| T033-T034 | Runtime + prompt wiring | 2 | `1a1a4e0` |
| T035-T036 | Persistence + observability | 2 | `6d86c8a` |
| T037-T038 | Agent + planner stubs | 2 | `1da126a` |
| T039-T040 | Full suite verification + closeout | 2 | (this commit) |

## Key Decisions

1. **Zod v4 `_def.type` behavior**: `.default()` wraps in `ZodDefault` whose `_def.type` is `"default"` not `"object"`. Config contract test needed adjustment to match `browser`/`sandbox`/`hooks`/`mcpServers` pattern.
2. **Layer 1.5 injection**: Repo-map is inserted between system prompt (Layer 1) and CLAUDE.md rules (Layer 2) in `composePrompt`, passed via optional `options` parameter through the stub.
3. **Build once per session**: `repoMapText` is cached in the runtime closure, built on first `startTurn` or `resumeSession`, never rebuilt mid-session.
4. **Deterministic ordering**: All file collection and rendering uses `localeCompare` for stable, reproducible output.
5. **`queryRepoMap` convenience function**: Agents (020) and planner (022) use this one-shot API (`collectFiles` + `buildRepoMap` + `searchRepoMap`) rather than importing each module separately.

## Defects Discovered & Fixed

- **Contract test nested keys**: `repoMap.*` sub-keys not surfaced because `ZodDefault` wraps the object type. Removed nested keys from expected set (matching existing `browser`/`sandbox`/`hooks` pattern).
- **Defaults test hardcoded keys**: Missing `"repoMap"` in `knownKeys` array. Added.
- **Integration test query field**: Tests used `{ query: "login" }` but `RepoMapQuery` expects `text` field. Fixed to `{ text: "login" }`.

## Test Coverage

```
repo-map unit tests:        28 tests across 8 files
config integration:         89 tests across 13 files
runtime integration:         6 tests
agents stubs:                2 tests
planning stubs:              2 tests
observability integration:   2 tests
persistence integration:     in existing suite
────────────────────────────────────────
Total repo-map related:    293 tests across 36 files
```
