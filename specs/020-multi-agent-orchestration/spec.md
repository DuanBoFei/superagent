# Feature Specification: Multi-Agent Orchestration

**Feature Branch**: `020-multi-agent-orchestration`  
**Created**: 2026-06-17  
**Status**: Draft  
**Input**: Improve real task success rate by introducing a narrow, serial multi-agent workflow: Explore → Implement → Review. This feature must not introduce a worker pool, DAG scheduler, or concurrent file writes.

## User Scenarios & Testing

### User Story 1 - Complex coding task is decomposed into specialist phases (Priority: P0)

As a developer, when I ask SuperAgent to perform a complex code task, it should first investigate, then implement, then review its own diff, so that it changes fewer wrong files and catches more mistakes before reporting completion.

**Why this priority**: The PRD north-star is first-fix success rate. A serial specialist workflow improves correctness without the complexity of worker pools.

**Independent Test**: Run a one-shot task that requires reading multiple files and editing one file. Verify the emitted events show Explore, Implement, and Review phases in order, and only Implement can write.

**Acceptance Scenarios**:

1. **Given** a task is classified as complex, **When** orchestration starts, **Then** it runs Explore before any write-capable phase.
2. **Given** Explore produces findings, **When** Implement starts, **Then** it receives the findings as structured context.
3. **Given** Implement modifies files, **When** Review starts, **Then** Review receives only task summary, diff summary, test output, and relevant findings.
4. **Given** Review reports blocking defects, **When** orchestration completes, **Then** the runtime reports the defects and does not claim success.

---

### User Story 2 - Simple tasks remain fast (Priority: P0)

As a developer, when I ask a simple question or request a small edit, SuperAgent should not force multi-agent orchestration.

**Why this priority**: Multi-agent should improve difficult tasks without making trivial tasks slower.

**Independent Test**: Run a simple read-only question and verify normal single-agent flow is used.

**Acceptance Scenarios**:

1. **Given** a task is read-only and simple, **When** the runtime classifies it, **Then** it uses the existing single-agent path.
2. **Given** a task is explicitly prefixed with `/multi-agent`, **When** it is otherwise simple, **Then** it uses the multi-agent path.

---

### User Story 3 - Agent permissions are role-scoped (Priority: P1)

As a developer, I want each sub-agent role to have a narrow permission profile so that exploration and review cannot accidentally mutate my project.

**Independent Test**: Attempt to run Write/Edit/Bash from Explore and Review role test stubs and verify permission denial.

**Acceptance Scenarios**:

1. **Given** Explore attempts Write/Edit/Bash, **When** permission is checked, **Then** the call is denied with role-scoped reason.
2. **Given** Review attempts Write/Edit/Bash, **When** permission is checked, **Then** the call is denied with role-scoped reason.
3. **Given** Implement attempts allowed writes, **When** normal permission rules approve, **Then** writes proceed through the existing permission system.

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-MA-01 | The system SHALL define three built-in orchestration roles: Explore, Implement, Review. |
| FR-MA-02 | The first implementation SHALL execute roles serially in the order Explore → Implement → Review. |
| FR-MA-03 | Explore SHALL be read-only and may call Read/Grep/Glob/WebSearch/MCP read-only tools only. |
| FR-MA-04 | Implement SHALL use the existing runtime/tool execution path and existing permission system for writes. |
| FR-MA-05 | Review SHALL be read-only and SHALL receive diff/test summaries rather than full unrestricted conversation history. |
| FR-MA-06 | The orchestrator SHALL emit structured phase lifecycle events: start, result, failure, skipped. |
| FR-MA-07 | The orchestrator SHALL preserve existing single-agent behavior for tasks not routed to multi-agent mode. |
| FR-MA-08 | The user SHALL be able to force multi-agent mode with a command or prompt marker. |
| FR-MA-09 | The orchestrator SHALL stop after Review if blocking defects are found and report them clearly. |
| FR-MA-10 | The orchestrator SHALL store phase summaries in session state so resume can explain what happened. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-MA-01 | No worker pool, arbitrary DAG scheduler, or concurrent write execution in this feature. |
| NFR-MA-02 | Existing runtime, permission, persistence, and observability tests SHALL continue to pass. |
| NFR-MA-03 | Multi-agent orchestration SHALL add no new npm dependencies. |
| NFR-MA-04 | Role prompts SHALL be deterministic and snapshot-testable. |

### Key Entities

- **AgentRole**: `explore | implement | review` with name, allowed tools, system guidance, and phase input contract.
- **OrchestrationRun**: one multi-agent execution for a user request.
- **PhaseResult**: structured output from one role: summary, findings, changedFiles, tests, defects.
- **RoutingDecision**: whether a user request uses single-agent or multi-agent flow.

### Edge Cases

- Explore finds no relevant files → Implement is skipped and user receives a blocker report.
- Implement makes no changes → Review still checks whether the no-op is justified.
- Review finds blocking defects → orchestration ends as incomplete, not success.
- User interrupts during a phase → current phase is marked interrupted and session can resume with summary.
- Existing permission deny rules override Implement role permissions.
