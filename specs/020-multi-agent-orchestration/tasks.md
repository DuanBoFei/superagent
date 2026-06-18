# Tasks: Multi-Agent Orchestration

| # | Task | Label | Dependencies | Verification |
|---|------|-------|--------------|--------------|
| T001 | Create `src/agents/types.ts` with `AgentRole`, `PhaseResult`, `OrchestrationRun` | [BE] | — | `pnpm test -- tests/agents/contract.test.ts` |
| T002 | Add contract snapshot test for exported agent domain types | [BE] | T001 | `pnpm test -- tests/agents/contract.test.ts` |
| T003 | Implement `role-prompts.ts` for Explore role | [BE] | T001 | `pnpm test -- tests/agents/role-prompts.test.ts` |
| T004 | Implement `role-prompts.ts` for Implement role | [BE] | T001 | `pnpm test -- tests/agents/role-prompts.test.ts` |
| T005 | Implement `role-prompts.ts` for Review role | [BE] | T001 | `pnpm test -- tests/agents/role-prompts.test.ts` |
| T006 | Add snapshot tests for all role prompts | [BE] | T003-T005 | `pnpm test -- tests/agents/role-prompts.test.ts` |
| T007 | Implement explicit `/multi-agent` routing marker parser | [BE] | T001 | `pnpm test -- tests/agents/router.test.ts` |
| T008 | Implement complexity heuristic for multi-file/bug/refactor prompts | [BE] | T007 | `pnpm test -- tests/agents/router.test.ts` |
| T009 | Add router tests for simple prompt bypass | [BE] | T007 | `pnpm test -- tests/agents/router.test.ts` |
| T010 | Add router tests for forced multi-agent prompt | [BE] | T007 | `pnpm test -- tests/agents/router.test.ts` |
| T011 | Add router tests for automatic complex prompt trigger | [BE] | T008 | `pnpm test -- tests/agents/router.test.ts` |
| T012 | Implement role permission wrapper skeleton | [BE] | T001 | `pnpm test -- tests/agents/role-permissions.test.ts` |
| T013 | Deny Write/Edit/Bash for Explore role | [BE] | T012 | `pnpm test -- tests/agents/role-permissions.test.ts` |
| T014 | Deny Write/Edit/Bash for Review role | [BE] | T012 | `pnpm test -- tests/agents/role-permissions.test.ts` |
| T015 | Delegate Implement permissions to existing checker | [BE] | T012 | `pnpm test -- tests/agents/role-permissions.test.ts` |
| T016 | Implement orchestrator phase order with fake phase runner | [BE] | T001 | `pnpm test -- tests/agents/orchestrator.test.ts` |
| T017 | Pass Explore findings into Implement input | [BE] | T016 | `pnpm test -- tests/agents/orchestrator.test.ts` |
| T018 | Pass diff/test summary into Review input | [BE] | T016 | `pnpm test -- tests/agents/orchestrator.test.ts` |
| T019 | Stop final success when Review returns blocking defects | [BE] | T016 | `pnpm test -- tests/agents/orchestrator.test.ts` |
| T020 | Emit phase lifecycle events from orchestrator | [BE] | T016 | `pnpm test -- tests/agents/orchestrator.test.ts` |
| T021 | Add observability event type definitions | [BE] | T020 | `pnpm test -- tests/observability` |
| T022 | Add persistence-friendly phase summary serializer | [BE] | T001 | `pnpm test -- tests/agents/orchestrator.test.ts` |
| T023 | Wire router into runtime without changing single-agent default | [INT] | T007-T011 | `pnpm test -- tests/runtime/multi-agent-integration.test.ts` |
| T024 | Wire orchestrator into runtime for forced multi-agent mode | [INT] | T016-T023 | `pnpm test -- tests/runtime/multi-agent-integration.test.ts` |
| T025 | Add fake-provider integration test for Explore → Implement → Review | [INT] | T024 | `pnpm test -- tests/runtime/multi-agent-integration.test.ts` |
| T026 | Add integration test proving simple prompt uses single-agent path | [INT] | T023 | `pnpm test -- tests/runtime/multi-agent-integration.test.ts` |
| T027 | Add CLI rendering label for multi-agent phase starts | [FE] | T020 | `pnpm test -- tests/cli` |
| T028 | Add one-shot smoke with `/multi-agent` and fake provider | [INT] | T024 | `pnpm test -- tests/runtime tests/agents` |
| T029 | Run focused test suite | [INT] | T001-T028 | `pnpm test -- tests/agents tests/runtime/multi-agent-integration.test.ts` |
| T030 | Update `state.md` and `session.md` closeout docs | [INT] | T029 | Review docs |
