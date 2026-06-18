# Tasks: Skill System

| # | Task | Label | Dependencies | Verification |
|---|------|-------|--------------|--------------|
| T001 | Create `src/skills/types.ts` with skill domain contracts | [BE] | — | `pnpm test -- tests/skills/contract.test.ts` |
| T002 | Add contract snapshot for `SkillManifest` and diagnostics | [BE] | T001 | `pnpm test -- tests/skills/contract.test.ts` |
| T003 | Implement `SKILL.md` frontmatter parser | [BE] | T001 | `pnpm test -- tests/skills/manifest.test.ts` |
| T004 | Add parser test for valid single-file skill | [BE] | T003 | `pnpm test -- tests/skills/manifest.test.ts` |
| T005 | Add parser test for malformed frontmatter | [BE] | T003 | `pnpm test -- tests/skills/manifest.test.ts` |
| T006 | Validate required manifest fields | [BE] | T001,T003 | `pnpm test -- tests/skills/validator.test.ts` |
| T007 | Validate skill name format | [BE] | T006 | `pnpm test -- tests/skills/validator.test.ts` |
| T008 | Validate semantic version string | [BE] | T006 | `pnpm test -- tests/skills/validator.test.ts` |
| T009 | Validate argument descriptors | [BE] | T006 | `pnpm test -- tests/skills/validator.test.ts` |
| T010 | Validate suggested mode and allowed roles | [BE] | T006 | `pnpm test -- tests/skills/validator.test.ts` |
| T011 | Enforce configurable skill body size limit | [BE] | T006 | `pnpm test -- tests/skills/validator.test.ts` |
| T012 | Implement deterministic skill directory discovery | [BE] | T003-T011 | `pnpm test -- tests/skills/discovery.test.ts` |
| T013 | Skip invalid skill while loading valid skills | [BE] | T012 | `pnpm test -- tests/skills/discovery.test.ts` |
| T014 | Emit diagnostic for missing `SKILL.md` | [BE] | T012 | `pnpm test -- tests/skills/discovery.test.ts` |
| T015 | Implement project-local duplicate override | [BE] | T012 | `pnpm test -- tests/skills/discovery.test.ts` |
| T016 | Add duplicate-name diagnostic test | [BE] | T015 | `pnpm test -- tests/skills/discovery.test.ts` |
| T017 | Implement `SkillRegistry` list and lookup APIs | [BE] | T012-T016 | `pnpm test -- tests/skills/registry.test.ts` |
| T018 | Return missing skill error with available names | [BE] | T017 | `pnpm test -- tests/skills/registry.test.ts` |
| T019 | Implement invocation argument validator | [BE] | T017 | `pnpm test -- tests/skills/invocation.test.ts` |
| T020 | Add missing required argument test | [BE] | T019 | `pnpm test -- tests/skills/invocation.test.ts` |
| T021 | Render injected skill context block | [BE] | T019 | `pnpm test -- tests/skills/prompt.test.ts` |
| T022 | Snapshot injected skill context format | [BE] | T021 | `pnpm test -- tests/skills/prompt.test.ts` |
| T023 | Add public exports from `src/skills/index.ts` | [BE] | T001-T022 | `pnpm test -- tests/skills` |
| T024 | Add skill settings to config defaults | [INT] | T012 | `pnpm test -- tests/config` |
| T025 | Wire skill discovery into runtime startup | [INT] | T017,T024 | `pnpm test -- tests/runtime/skill-integration.test.ts` |
| T026 | Wire `/skill <name>` invocation into CLI command parsing | [INT] | T019 | `pnpm test -- tests/cli` |
| T027 | Add skill listing CLI output | [INT] | T017,T026 | `pnpm test -- tests/cli` |
| T028 | Inject selected skill context into runtime prompt | [INT] | T021,T025 | `pnpm test -- tests/runtime/skill-integration.test.ts` |
| T029 | Verify skill tool guidance still uses permissions | [INT] | T028 | `pnpm test -- tests/runtime/skill-integration.test.ts tests/permissions` |
| T030 | Persist skill discovery diagnostics | [INT] | T012,T024 | `pnpm test -- tests/persistence` |
| T031 | Persist skill invocation events | [INT] | T019,T028 | `pnpm test -- tests/persistence tests/runtime/skill-integration.test.ts` |
| T032 | Filter role-compatible skills for 020 prompts | [INT] | T010,T023 | `pnpm test -- tests/agents tests/skills` |
| T033 | Route `suggestedMode: plan` skills to 022 adapter | [INT] | T010,T023 | `pnpm test -- tests/planning tests/skills` |
| T034 | Run focused skill suite | [INT] | T001-T033 | `pnpm test -- tests/skills tests/runtime/skill-integration.test.ts` |
| T035 | Update closeout docs `state.md` and `session.md` | [INT] | T034 | Review docs |
