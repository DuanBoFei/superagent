# Feature 024 · Skill System — Session Notes

## Status: Complete — 34/35 tasks done (T032 deferred)

## Task Summary

| # | Group | Tasks | Commits |
|---|-------|-------|---------|
| T001-T002 | Domain contracts + snapshot | 2 | `ab1324a` |
| T003-T005 | SKILL.md frontmatter parser | 3 | `b5ea28e` |
| T006-T011 | Manifest validator | 6 | `00f14fa` |
| T012-T016 | Directory discovery + diagnostics | 5 | `aedc9dd` |
| T017-T018 | Registry lookup + list APIs | 2 | `aedc9dd` |
| T019-T020 | Invocation argument validator | 2 | `aedc9dd` |
| T021-T022 | Prompt context rendering | 2 | `aedc9dd` |
| T023 | Barrel exports | 1 | `aedc9dd` |
| T024 | Config settings + defaults | 1 | `aedc9dd` |
| T025-T029 | Runtime + CLI + prompt wiring | 5 | `aedc9dd` |
| T030-T031 | Persistence + observability | 2 | `aedc9dd` |
| T032-T033 | Routing (role filter + plan mode) | 2 | `c3cc3dc` |
| T034 | Focused suite verification | 1 | (verified: 77/77) |
| T035 | Closeout docs | 1 | (this commit) |

## Key Decisions

1. **Minimal YAML parser**: The frontmatter parser implements only the YAML subset needed for skill manifests (string, number, boolean, array, nested object with `properties`). Full YAML spec parsing was intentionally avoided to keep the parser simple and deterministic.

2. **Layer 2.5 injection**: Skill context is injected between system prompt (Layer 1) and CLAUDE.md rules (Layer 2) in `composePrompt`, as `### Skill: <name>` followed by the skill body. This is after the repo-map (Layer 1.5) but before tool definitions (Layer 3).

3. **Duplicate override semantics**: When a skill with the same name exists in both global and project-local directories, the project-local version silently overrides. A diagnostic is emitted to surface the conflict.

4. **Forward-compatible routing**: `filterByAllowedRoles` and `getPlanModeSkills` are implemented now but only fully integrated when features 020 (multi-agent) and 022 (plan-mode) are complete. `skillSuggestedPlan` is already wired into the planning detector.

5. **No new dependencies**: The entire skill system was built with zero new npm packages — frontmatter parsing is custom, validation uses existing Zod, file system uses Node.js built-ins.

## Defects Discovered & Fixed

- **Config validator rejected "skills" as unknown key**: `configSchema` lacked a `skills` entry and `NESTED_KEYS` didn't include `"skills"`. Fixed by adding `skillConfigSchema` with `.default()` and registering in both the schema and the nested keys set. Affected 5 test files.

- **Hooks integration test `baseConfig` missing required fields**: The test helper was missing `sandbox`, `browser`, `repoMap`, and `skills` required `Config` fields, causing `Cannot read properties of undefined` at `runtime.ts:242`. Fixed by adding all four with typed defaults.

- **Discovery test calling `discoverSkills` without options**: `discoverSkills` requires `ValidationOptions` as second required parameter. Fixed by adding `{ maxBodySize: 65536 }` to all test calls.

- **Tool format in integration test**: Tests searched for JSON `"Read"` but tool definitions use Markdown format `### Read` under `## Available Tools`. Fixed assertions to match the actual render format.

## Test Coverage

```
skills/contract.test.ts:              9 tests
skills/manifest.test.ts:              8 tests
skills/validator.test.ts:            20 tests
skills/discovery.test.ts:             8 tests
skills/registry.test.ts:              5 tests
skills/invocation.test.ts:            6 tests
skills/prompt.test.ts:                4 tests
skills/routing.test.ts:               8 tests
runtime/skill-integration.test.ts:    9 tests
────────────────────────────────────────
Total skill system tests:           77 tests across 9 files
```

## Deferred Work

| Item | Reason | Target |
|------|--------|--------|
| T032: Wire `filterByAllowedRoles` into agent role prompt | Feature 020 (multi-agent) not yet implemented | When 020 is built |
| Full plan-mode skill routing end-to-end | Feature 022 plan-mode adapter needs the `getPlanModeSkills` hook | When 022 adapter is built |
| Dedicated persistence round-trip tests for skill state | Existing suite covers fields implicitly; explicit test deferred | T030/T031 follow-up |
