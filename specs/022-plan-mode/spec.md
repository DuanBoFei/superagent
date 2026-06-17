# Feature Specification: Plan Mode

**Feature Branch**: `022-plan-mode`  
**Created**: 2026-06-17  
**Status**: Draft  
**Input**: Add a plan-before-execute mode that can be manually triggered with `/plan` and automatically triggered for complex or risky tasks. The goal is to reduce over-broad edits and improve user control without slowing simple tasks.

## User Scenarios & Testing

### User Story 1 - User manually requests a plan (Priority: P0)

As a developer, when I type `/plan <task>`, SuperAgent should analyze the task and produce an actionable plan without modifying files until I approve execution.

**Why this priority**: Users need an explicit way to slow the agent down for risky tasks.

**Independent Test**: Run `/plan change auth flow` with fake provider and verify no Write/Edit/Bash side effects occur before approval.

**Acceptance Scenarios**:

1. **Given** user enters `/plan`, **When** runtime processes it, **Then** the runtime enters planning mode.
2. **Given** planning mode is active, **When** model requests Write/Edit/Bash, **Then** the calls are denied or deferred.
3. **Given** a plan is generated, **When** user approves, **Then** execution continues using the approved plan.
4. **Given** user rejects, **When** planning ends, **Then** no file changes are made.

---

### User Story 2 - Complex tasks automatically trigger plan mode (Priority: P0)

As a developer, when a request is likely to touch multiple files or perform risky operations, SuperAgent should propose a plan before editing.

**Independent Test**: Submit a multi-file refactor prompt and verify route decision enters plan mode; submit a small read-only question and verify no plan mode.

**Acceptance Scenarios**:

1. **Given** a prompt asks for refactor/feature across modules, **When** routing runs, **Then** plan mode is triggered.
2. **Given** a prompt asks a simple question, **When** routing runs, **Then** existing direct execution remains unchanged.
3. **Given** the model attempts to edit 3+ files without a plan, **When** pre-tool guard runs, **Then** execution is paused for plan approval.

---

### User Story 3 - Plans are executable and testable (Priority: P1)

As a developer, I want plans to include concrete steps, affected files, verification commands, and risk notes so I can approve confidently.

**Independent Test**: Generate plan from fixture prompt and verify required fields exist.

**Acceptance Scenarios**:

1. **Given** plan output is parsed, **Then** it includes summary, steps, affected files, verification, risks.
2. **Given** plan output is malformed, **Then** it is shown as text but not auto-approved.

## Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-PL-01 | The CLI/runtime SHALL recognize `/plan` as an explicit plan-mode trigger. |
| FR-PL-02 | The system SHALL automatically trigger plan mode for complex/risky prompts using deterministic heuristics. |
| FR-PL-03 | Planning mode SHALL prevent Write/Edit/Bash side effects before approval. |
| FR-PL-04 | A plan SHALL include summary, steps, expected files, verification, and risks. |
| FR-PL-05 | The user SHALL be able to approve or reject a plan. |
| FR-PL-06 | Rejected plans SHALL leave the filesystem unchanged. |
| FR-PL-07 | Approved plans SHALL be passed into execution context. |
| FR-PL-08 | Plan mode SHALL emit observability events for planned, approved, rejected, and executed. |
| FR-PL-09 | Plan mode SHALL integrate with 020 so multi-agent Implement can consume approved plans. |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-PL-01 | Simple read-only tasks must not be forced into plan mode. |
| NFR-PL-02 | Planning decisions must be deterministic and unit tested. |
| NFR-PL-03 | No new npm dependencies. |
| NFR-PL-04 | Plan approval state must survive session save/resume when feasible. |

### Key Entities

- **PlanModeRequest**: user prompt, trigger reason, original input.
- **ExecutionPlan**: summary, steps, affectedFiles, verification, risks, assumptions.
- **PlanDecision**: direct, plan-required, plan-requested.
- **PlanApproval**: approved, rejected, pending.

### Edge Cases

- `/plan` with empty task → ask user for task details.
- Model returns a plan that includes destructive commands → plan is shown but not auto-approved.
- User approves after resume → execution uses stored approved plan.
- Auto-trigger heuristic false positive → user can reject and ask for direct execution.
- Auto-trigger heuristic false negative but model attempts broad write → pre-tool guard pauses and requests plan.
