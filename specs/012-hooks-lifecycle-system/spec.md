# Spec: Hooks Lifecycle System

## Feature Overview

### What

SuperAgent can run user-configured lifecycle hooks at key points in a CLI Agent session, including session startup, user prompt submission, tool execution, compaction, and session stop. Hooks can observe runtime events, block or modify selected flows where explicitly supported, and report safe diagnostics without destabilizing the Agent.

### Why

MVP SuperAgent can execute tools and enforce permissions, but production users need project-specific automation around that lifecycle: validating prompts, enforcing local policies, running formatters after edits, collecting audit signals, and stopping unsafe or non-compliant actions before they proceed. A first-class Hooks system turns SuperAgent from a fixed CLI assistant into an extensible local automation platform while preserving the existing safety boundary.

---

## Clarifications

### Session 2026-06-14

- Q: Which hook execution types are in scope for v1.1? → A: v1.1 supports local command hooks only; HTTP, prompt/LLM-evaluator, and agent hooks are deferred to later features to preserve local-first behavior and avoid new network/security surfaces.
- Q: Which hook outcomes can affect Agent execution? → A: PreToolUse and UserPromptSubmit hooks may block continuation with a safe message; Post* hooks are observe-only and cannot rewrite completed results.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| Hook configuration | Users can configure hooks in global or project settings and enable/disable each hook |
| Lifecycle events | SuperAgent emits hook points for session start, user prompt submit, pre-tool, post-tool, post-tool failure, pre-compact, and stop |
| Local command hooks | Hooks execute local commands with structured JSON input through stdin and receive JSON/text output |
| Blocking hooks | Supported pre-action hooks can block the current action with a safe user-visible reason |
| Timeout handling | Slow hooks are terminated after a configured timeout and reported safely |
| Failure isolation | Hook failures do not crash the Agent session unless the hook is configured as blocking and the blocking contract applies |
| Secret redaction | Hook logs, terminal output, and observability events redact secret-like values |
| Observability | Hook start/end/failure events are written to the existing observability flow |

### Out of Scope (v1.1)

| Scope | Reason |
|-------|--------|
| HTTP hooks | Adds outbound network and auth surface; defer until local command contract is stable |
| Prompt/LLM evaluator hooks | Requires model routing and cost controls outside the v1.1 local hook MVP |
| Agent hooks | Depends on future multi-agent/sub-agent architecture |
| Plugin marketplace | Requires distribution, trust, signature, and update policy beyond lifecycle execution |
| Arbitrary mutation of model messages/tool results | High risk of hidden behavior; v1.1 only supports explicit blocking at selected pre-action hook points |

---

## User Scenarios & Testing

### Primary User Story

As a project maintainer, I want to define local lifecycle hooks so SuperAgent can enforce project-specific checks and run automation during an Agent session without modifying SuperAgent source code.

### Acceptance Scenarios

#### AC-HOOK-01: Run SessionStart hook

**Given** project configuration contains an enabled `SessionStart` command hook
**When** SuperAgent starts a session
**Then** the hook receives session metadata as JSON input, its result is logged, and the session continues when the hook succeeds.

#### AC-HOOK-02: Block unsafe prompt through UserPromptSubmit

**Given** a `UserPromptSubmit` hook is configured to block prompts matching a local policy
**When** the user submits a prompt that the hook rejects
**Then** SuperAgent shows the hook-provided safe reason and does not send that prompt to the model.

#### AC-HOOK-03: Block tool execution through PreToolUse

**Given** a `PreToolUse` hook is configured for Bash commands
**When** the Agent requests a matching tool call and the hook returns a block decision
**Then** SuperAgent does not execute the tool and returns a permission-like blocked result to the Agent.

#### AC-HOOK-04: Observe tool completion through PostToolUse

**Given** a `PostToolUse` hook is configured
**When** a tool call finishes successfully
**Then** the hook receives safe tool call metadata and the original tool result remains unchanged.

#### AC-HOOK-05: Hook failure isolation

**Given** one configured hook command exits non-zero or times out
**When** the related lifecycle event fires
**Then** SuperAgent records the hook failure, redacts secrets, and continues according to the hook point's blocking/observe-only contract.

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-HOOK-01 | SuperAgent MUST support configuring multiple hooks per lifecycle event from global and project settings. |
| FR-HOOK-02 | SuperAgent MUST allow each hook entry to be enabled or disabled without deleting its configuration. |
| FR-HOOK-03 | SuperAgent MUST support local command hooks with command, args, env, timeoutMs, and optional matcher fields. |
| FR-HOOK-04 | SuperAgent MUST emit hook points for `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PreCompact`, and `Stop`. |
| FR-HOOK-05 | SuperAgent MUST pass structured JSON event payloads to hook commands through stdin. |
| FR-HOOK-06 | SuperAgent MUST parse hook output into a normalized result supporting `continue`, `block`, and `message` fields where applicable. |
| FR-HOOK-07 | SuperAgent MUST allow `UserPromptSubmit` and `PreToolUse` hooks to block continuation with a safe user-visible message. |
| FR-HOOK-08 | SuperAgent MUST treat `SessionStart`, `PostToolUse`, `PostToolUseFailure`, `PreCompact`, and `Stop` hooks as observe-only in v1.1. |
| FR-HOOK-09 | SuperAgent MUST apply hook matchers so tool hooks can target all tools, one tool, or tool-specific input patterns. |
| FR-HOOK-10 | SuperAgent MUST enforce per-hook timeout and terminate timed-out hook processes. |
| FR-HOOK-11 | SuperAgent MUST isolate hook process failures so failed observe-only hooks do not crash the Agent session. |
| FR-HOOK-12 | SuperAgent MUST redact secret-like values from hook payload logs, hook stderr/stdout summaries, verbose output, and observability events. |
| FR-HOOK-13 | SuperAgent MUST log hook lifecycle events in the existing observability flow, including event name, hook name, duration, exit status, and decision. |

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| Hook command not found | Mark hook execution failed, show concise setup error when relevant, continue unless a blocking hook explicitly blocks |
| Hook exits non-zero | Record failure with safe stderr summary; observe-only hook does not alter Agent flow |
| Hook times out | Terminate hook process, record timeout, continue or block according to hook point contract |
| Hook returns invalid JSON | Treat as failure with safe error; do not crash session |
| Multiple hooks on one event | Run in configured order; first blocking decision stops remaining hooks for that event |
| Project and global hooks overlap | Later config layer overrides or appends according to existing config merge semantics |
| Hook output contains secret-like data | Redact before terminal/log/verbose output |
| Stop hook fails | Record failure but do not prevent session shutdown |

---

## Key Entities

| Entity | Description |
|--------|-------------|
| Hook Config | User/project-defined hook entry with event, command, args, env, timeout, enabled flag, and matcher |
| Hook Event | Runtime lifecycle event payload passed to matching hooks |
| Hook Execution | One attempt to run one hook command for one event |
| Hook Result | Normalized outcome: continue, block, message, stdout/stderr summaries, duration, exit status |
| Hook Matcher | Rule that determines whether a hook applies to a lifecycle event, tool name, or input pattern |

---

## Success Criteria

| ID | Criterion |
|----|-----------|
| SC-HOOK-01 | A user can configure a working SessionStart command hook and see it run in a new session without modifying SuperAgent source code. |
| SC-HOOK-02 | A UserPromptSubmit hook can block a prompt before any model request is made. |
| SC-HOOK-03 | A PreToolUse hook can block a matching tool call before tool execution begins. |
| SC-HOOK-04 | Failed or timed-out observe-only hooks do not crash the session or mutate tool results. |
| SC-HOOK-05 | 100% of hook logs and displayed hook diagnostics redact secret-like values. |

---

## Assumptions

- Hooks are local automation and policy controls, not a plugin marketplace.
- v1.1 should favor predictable, inspectable behavior over maximum extensibility.
- Hook commands are user-configured local processes and are therefore subject to the existing permission and local-first trust model.
- Existing observability and config infrastructure from MVP features are available for integration.
