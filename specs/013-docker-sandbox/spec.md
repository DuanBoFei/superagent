# Spec: Docker Sandbox

## Feature Overview

### What

SuperAgent can run supported tool commands inside a local Docker sandbox instead of the host shell, giving users a stronger execution boundary for Agent-driven command execution while keeping the CLI workflow local and inspectable.

### Why

The MVP relies on permissions and dangerous-command interception, but advanced users need an additional safety layer when allowing the Agent to run build scripts, tests, package commands, or browser-related tooling. Docker sandbox support reduces host blast radius, prepares the runtime for Playwright/browser isolation, and keeps SuperAgent aligned with the v1.1 plan without introducing cloud sandbox dependencies.

---

## Clarifications

### Session 2026-06-14

- Q: Which sandbox target is in scope for v1.1? → A: v1.1 supports local Docker containers only; cloud sandboxes such as E2B/Daytona and OS-specific sandboxes such as Seatbelt/Bubblewrap are deferred.
- Q: Should sandboxing bypass existing permissions? → A: No. Docker sandboxing is an execution boundary after permission approval; dangerous command deny/ask behavior remains authoritative and cannot be downgraded by sandbox mode.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| Sandbox configuration | Users can enable Docker sandbox mode and configure image, workspace mount, network policy, env allowlist, and resource limits |
| Bash execution isolation | Bash/tool commands configured for sandbox execution run inside a container instead of directly on the host |
| Workspace mapping | Project workspace is mounted into the container at a deterministic path |
| Permission compatibility | Existing allow/ask/deny and dangerous command checks still run before sandbox execution |
| Output compatibility | Sandbox execution returns stdout, stderr, exit code, duration, and timeout results in the same shape as existing Bash results |
| Failure handling | Missing Docker, image pull failure, container startup failure, and timeout are reported safely without crashing the Agent session |
| Observability | Sandbox lifecycle and command execution events are logged through existing observability |
| Secret control | Only configured environment variables enter the container; logs and terminal output redact secret-like values |

### Out of Scope (v1.1)

| Scope | Reason |
|-------|--------|
| Cloud sandboxes | PRD marks cloud sandbox out of scope; local-first keeps code on user machine |
| OS-native sandboxes | Seatbelt/Bubblewrap/Landlock are platform-specific and better handled after Docker contract stabilizes |
| Full filesystem virtualization | v1.1 mounts the workspace and optional temp/cache directories only |
| Per-tool custom images marketplace | Requires plugin/distribution governance beyond sandbox runtime |
| Running arbitrary MCP servers in sandbox | This feature focuses on command/tool execution isolation; MCP sandboxing can be a later integration |

---

## User Scenarios & Testing

### Primary User Story

As a developer, I want Agent-run shell commands to execute in a local Docker sandbox so that builds and tests can run with reduced access to my host environment.

### Acceptance Scenarios

#### AC-SBX-01: Run Bash command in Docker sandbox

**Given** sandbox mode is enabled with a valid Docker image
**When** the Agent requests an approved Bash command
**Then** SuperAgent runs the command inside the container, captures stdout/stderr/exit code, and returns the result to the Agent.

#### AC-SBX-02: Permission checks still apply before sandbox execution

**Given** sandbox mode is enabled
**When** the Agent requests a command that existing policy denies or asks for approval
**Then** SuperAgent applies the same permission outcome before starting any container.

#### AC-SBX-03: Workspace is mounted at deterministic path

**Given** the user starts SuperAgent in a project workspace
**When** a sandboxed command runs
**Then** the command sees the project files under the configured container workspace path and cannot access arbitrary host paths through default mounts.

#### AC-SBX-04: Docker unavailable is isolated

**Given** sandbox mode is enabled but Docker is not available or not running
**When** the Agent requests a sandboxed command
**Then** SuperAgent returns a safe setup error and continues the session without crashing.

#### AC-SBX-05: Sandbox timeout and resource failure are safe

**Given** a sandboxed command exceeds the configured timeout or resource limit
**When** SuperAgent terminates the execution
**Then** the result reports timeout/failure safely and the session remains usable.

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-SBX-01 | SuperAgent MUST support a `sandbox` configuration section with Docker enablement, image, workspace mount path, network policy, env allowlist, timeout, and resource limits. |
| FR-SBX-02 | SuperAgent MUST preserve existing permission and dangerous-command checks before any sandboxed execution starts. |
| FR-SBX-03 | SuperAgent MUST execute configured Bash/tool commands inside a local Docker container when sandbox mode is enabled. |
| FR-SBX-04 | SuperAgent MUST mount the current workspace into the container at a deterministic path. |
| FR-SBX-05 | SuperAgent MUST avoid passing host environment variables into the container unless explicitly allowlisted. |
| FR-SBX-06 | SuperAgent MUST support disabling network access for sandboxed commands when configured. |
| FR-SBX-07 | SuperAgent MUST enforce per-command timeout and return a timeout result when exceeded. |
| FR-SBX-08 | SuperAgent MUST normalize sandbox command results into stdout, stderr, exitCode, durationMs, timedOut, and safe error fields compatible with existing Bash results. |
| FR-SBX-09 | SuperAgent MUST report Docker unavailable, image missing/pull failure, container startup failure, and command failure with user-safe messages. |
| FR-SBX-10 | SuperAgent MUST redact secret-like values from sandbox command input summaries, env summaries, stdout/stderr summaries, verbose output, and logs. |
| FR-SBX-11 | SuperAgent MUST emit observability events for sandbox start, sandbox end, and sandbox failure. |
| FR-SBX-12 | SuperAgent MUST keep built-in non-sandboxed tools usable when Docker sandbox execution fails. |

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| Docker CLI/daemon unavailable | Return safe setup error; session continues |
| Image missing and pull disabled | Return image unavailable error; do not silently pull |
| Image pull fails | Return safe pull failure summary; session continues |
| Container startup fails | Return safe startup failure; session continues |
| Command exits non-zero | Return stdout/stderr/exitCode to Agent, same as Bash failure semantics |
| Command times out | Terminate container execution and return timedOut result |
| Network disabled | Container command cannot reach network by default |
| Env contains secret-like values | Do not log or display raw values |
| Workspace path contains spaces | Mount and working directory handling remains correct |

---

## Key Entities

| Entity | Description |
|--------|-------------|
| Sandbox Config | User/project-defined Docker sandbox settings |
| Sandbox Profile | Resolved execution profile used for one command |
| Sandbox Execution | One sandboxed command run with lifecycle status, inputs, result, and diagnostics |
| Sandbox Result | Normalized command result compatible with tool dispatcher expectations |
| Sandbox Availability | Runtime probe result for Docker CLI/daemon/image readiness |

---

## Success Criteria

| ID | Criterion |
|----|-----------|
| SC-SBX-01 | A user can enable Docker sandbox mode and run an approved command inside a container without changing Agent prompts. |
| SC-SBX-02 | 100% of sandboxed commands still pass through existing permission checks before container startup. |
| SC-SBX-03 | Docker unavailable or container startup failure does not terminate the Agent session. |
| SC-SBX-04 | Secret-like env/output values are redacted from 100% of sandbox logs and terminal diagnostics. |
| SC-SBX-05 | A sandboxed command timeout returns a clear timed-out result and leaves subsequent commands usable. |

---

## Assumptions

- Docker is optional; users must explicitly enable sandbox mode.
- Sandbox mode is a defense-in-depth execution boundary, not a replacement for permission policy.
- v1.1 focuses on local Docker because it preserves local-first behavior and avoids cloud execution risk.
- The existing Bash/tool result shape is the compatibility target for sandbox command output.
