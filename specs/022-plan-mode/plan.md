# Plan: Plan Mode

## 1. Architecture Overview

```mermaid
flowchart TD
    USER[User prompt] --> DETECT[PlanModeDetector]
    DETECT -->|direct| RUNTIME[Existing runtime]
    DETECT -->|plan requested|required| PLANNER[Planner]
    PLANNER --> PLAN[ExecutionPlan]
    PLAN --> VALIDATE[Plan validator]
    VALIDATE --> APPROVAL[Plan approval prompt]
    APPROVAL -->|rejected| STOP[Stop without writes]
    APPROVAL -->|approved| EXEC[Execution with approved plan context]
    EXEC --> GUARD[Plan scope guard]
    GUARD -->|within scope| TOOLS[Existing tool execution]
    GUARD -->|scope expands| REPLAN[Require re-plan]
```

## 2. Functional Components

| Component | Responsibility |
|-----------|----------------|
| `src/planning/types.ts` | Plan decision, execution plan, approval state. |
| `src/planning/detector.ts` | Detect `/plan` and automatic complex/risky triggers. |
| `src/planning/prompt.ts` | Build planner prompt and expected plan format. |
| `src/planning/parser.ts` | Parse model output into `ExecutionPlan`; handle malformed plans. |
| `src/planning/approval.ts` | Approval/rejection state machine. |
| `src/planning/scope-guard.ts` | Prevent writes before approval and detect scope expansion. |
| Runtime integration | Route plan requests and inject approved plan into execution context. |
| CLI integration | Render plan and ask approve/reject. |

## 3. Data Flow

1. User prompt enters runtime.
2. Detector checks explicit `/plan` and automatic trigger heuristics.
3. If direct, existing runtime proceeds.
4. If planning required, planner model call creates candidate plan.
5. Parser normalizes candidate into `ExecutionPlan` or marks malformed.
6. CLI displays plan with affected files, steps, verification, risks.
7. User approves or rejects.
8. On approve, runtime executes with plan context and scope guard.
9. Scope guard blocks writes before approval and asks re-plan if scope expands materially.
10. Plan events are logged and persisted.

## 4. Technical Architecture

```text
src/planning/
  types.ts
  detector.ts
  prompt.ts
  parser.ts
  approval.ts
  scope-guard.ts
  index.ts

tests/planning/
  contract.test.ts
  detector.test.ts
  prompt.test.ts
  parser.test.ts
  approval.test.ts
  scope-guard.test.ts

tests/runtime/
  plan-mode-integration.test.ts
```

## 5. Documentation Structure

```text
specs/022-plan-mode/
  spec.md
  clarify.md
  plan.md
  tasks.md
  state.md
  session.md
```

## 6. Integration Points

| Existing Area | Integration |
|---------------|-------------|
| `src/cli` | Parse `/plan`, render plan approval prompt. |
| `src/runtime` | Add plan routing before normal execution. |
| `src/permissions` | Deny/defer writes while approval is pending. |
| `src/hooks` | Optional use of PreToolUse guard for broad writes. |
| `src/persistence` | Save pending/approved plan state. |
| `020 agents` | Implement phase receives approved plan context. |

## 7. Test Strategy

| Test Type | What It Covers |
|-----------|----------------|
| Detector unit | `/plan`, simple bypass, complex auto-trigger. |
| Parser unit | Valid plan, malformed plan, markdown fallback. |
| Approval unit | pending → approved/rejected transitions. |
| Scope guard unit | deny writes before approval; detect 3+ file expansion. |
| Runtime integration | `/plan` produces no writes before approval. |
| CLI integration | Plan render and approve/reject flow. |

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Over-triggering plan mode | Deterministic tests and user rejection path. |
| Under-triggering broad edits | Pre-tool scope guard catches late expansion. |
| Plan becomes vague | Plan schema requires files/verification/risks. |
| Approval state lost on resume | Persist plan approval state in session events. |
