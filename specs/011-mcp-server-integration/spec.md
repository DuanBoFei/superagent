# Spec: MCP Server Integration

## Feature Overview

### What

SuperAgent can connect to external MCP servers configured by the user, discover the tools those servers expose, and make those tools available inside the normal Agent tool workflow with clear status, permission checks, and safe failure behavior.

### Why

The MVP includes built-in tools, but users will quickly need project-specific and community-provided tools such as filesystem helpers, GitHub, databases, browser automation, and internal services. MCP is the ecosystem standard for adding those tools without baking every integration into SuperAgent itself.

---

## Clarifications

### Session 2026-06-14

- Q: MCP tools should follow which default permission policy? → A: MCP tool calls use the same permission pipeline as built-in tools, but newly discovered MCP tools default to ask unless explicitly allowlisted; rules should support server/tool-level matching and deny must override allow.

---

## Functional Boundaries

### In Scope

| Scope | Description |
|-------|-------------|
| Server configuration | Users can define named MCP servers in configuration and enable or disable them per project |
| Local server connection | SuperAgent can start and connect to local command-based MCP servers |
| Remote server connection | SuperAgent can connect to remote MCP servers over a stream-capable HTTP transport |
| Tool discovery | SuperAgent can list tools exposed by connected MCP servers and present them as available agent tools |
| Tool invocation | The Agent can call an MCP tool and receive a structured result or user-readable error |
| Connection lifecycle | Server states are visible as connecting, connected, failed, or disabled |
| Tool refresh | Tool lists refresh after startup and between turns so newly available tools can be used |
| Permission boundary | MCP tool calls pass through the same permission policy as built-in tools before execution |
| Failure handling | A broken or unavailable MCP server does not crash the session or block unrelated tools |

### Out of Scope (v1.1)

| Scope | Reason |
|-------|--------|
| MCP server marketplace | Requires distribution, trust, and plugin governance beyond connection support |
| Authoring MCP servers | This feature consumes external MCP servers; building server SDK helpers is separate |
| OAuth/account linking UI | Remote authenticated services require a broader identity and secrets flow |
| Long-running MCP resources/prompts | Tool calls are the primary v1.1 need; resources/prompts can be added later |
| Browser automation itself | Browser use is planned as a later feature that may consume MCP or Playwright directly |

---

## User Scenarios & Testing

### Primary User Story

As a developer, I want to add an MCP server to my project configuration so SuperAgent can use that server's tools during a coding session without requiring changes to SuperAgent's source code.

### Acceptance Scenarios

#### AC-MCP-01: Connect configured local server

**Given** a project configuration contains an enabled local MCP server named `filesystem`
**When** SuperAgent starts a session in that project
**Then** the server is shown as connected, and its tools are available to the Agent with the server name included in the tool identity.

#### AC-MCP-02: Connect configured remote server

**Given** a project configuration contains an enabled remote MCP server
**When** SuperAgent starts a session and the remote endpoint is reachable
**Then** the server is shown as connected, and its tools are available to the Agent without blocking built-in tools.

#### AC-MCP-03: Invoke MCP tool through normal permissions

**Given** an MCP tool is available and the Agent requests to call it
**When** the request matches the current permission policy
**Then** SuperAgent either executes, asks for approval, or denies the call using the same user-facing permission behavior as built-in tools.

#### AC-MCP-04: MCP server failure is isolated

**Given** one configured MCP server fails to start or disconnects during a session
**When** the Agent continues the task
**Then** SuperAgent reports that server as failed, removes or marks its tools unavailable, and built-in tools plus other connected MCP servers continue working.

#### AC-MCP-05: Tool refresh updates availability

**Given** a configured MCP server's available tools change between turns
**When** SuperAgent refreshes external tool availability
**Then** newly available tools can be used in later turns and removed tools are no longer offered.

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-MCP-01 | SuperAgent MUST support multiple named MCP server entries in user or project configuration. |
| FR-MCP-02 | SuperAgent MUST allow each MCP server entry to be enabled or disabled without deleting its configuration. |
| FR-MCP-03 | SuperAgent MUST connect to enabled local command-based MCP servers at session startup. |
| FR-MCP-04 | SuperAgent MUST connect to enabled remote stream-capable HTTP MCP servers at session startup. |
| FR-MCP-05 | SuperAgent MUST expose connected MCP server tools as Agent-callable tools with names that prevent collisions across servers and built-in tools. |
| FR-MCP-06 | SuperAgent MUST include a user-readable server/tool identity whenever an MCP tool is displayed, approved, logged, or summarized. |
| FR-MCP-07 | SuperAgent MUST route every MCP tool call through the existing permission policy before invocation, with newly discovered MCP tools defaulting to ask unless a server/tool-specific rule explicitly allows or denies them. |
| FR-MCP-07A | SuperAgent MUST support permission matching at three MCP granularities: all MCP tools, all tools from one MCP server, and one specific tool from one server; deny rules MUST take precedence over allow rules. |
| FR-MCP-08 | SuperAgent MUST report connection failures with enough context for users to fix configuration problems without exposing secrets. |
| FR-MCP-09 | SuperAgent MUST isolate MCP server failures so one failed server does not terminate the Agent session. |
| FR-MCP-10 | SuperAgent MUST refresh MCP tool availability after startup and between Agent turns. |
| FR-MCP-11 | SuperAgent MUST preserve session stability when an MCP tool returns malformed, oversized, or failed output. |
| FR-MCP-12 | SuperAgent MUST log MCP server connection state changes and MCP tool calls in the existing observability flow. |

---

## Boundary Conditions

| Condition | Behavior |
|-----------|----------|
| Server command not found | Mark server failed, show concise setup error, continue session |
| Remote server unreachable | Mark server failed with retry-safe message, continue without its tools |
| Two servers expose same tool name | Keep both tools available using server-qualified identities |
| MCP tool output is too large | Truncate for conversation context while preserving a clear truncation notice |
| MCP tool call times out | Return a tool error to the Agent and keep the server state recoverable |
| Server disconnects mid-session | Mark its tools unavailable until a successful refresh or reconnect |
| Configuration contains secret-like values | Do not print secrets in errors, logs, verbose output, or summaries |

---

## Key Entities

| Entity | Description |
|--------|-------------|
| MCP Server Config | User/project-defined named server entry, including transport kind, enablement, and connection details |
| MCP Server Session | Runtime connection state for one configured server |
| MCP Tool Definition | Tool metadata discovered from a connected server and exposed to the Agent |
| MCP Tool Call | One attempted invocation of a discovered tool, including permission decision, result, and error state |

---

## Success Criteria

| ID | Criterion |
|----|-----------|
| SC-MCP-01 | A user can add a working local MCP server to project configuration and see its tools become available in a new session in under 10 seconds. |
| SC-MCP-02 | A failed MCP server connection does not prevent the user from continuing a normal coding task with built-in tools. |
| SC-MCP-03 | 100% of MCP tool calls are subject to the same allow/ask/deny permission outcomes as built-in tools. |
| SC-MCP-04 | Users can identify which server provided a tool from tool display, logs, and session summaries without reading source code. |
| SC-MCP-05 | Tool availability changes are reflected by the next Agent turn after refresh, without restarting the whole application. |

---

## Assumptions

- The feature focuses on MCP tools first because they unlock the most immediate community integration value.
- Project configuration can override or supplement global MCP server configuration.
- Remote authenticated services may be configured with existing environment variables or external secret mechanisms, but this feature does not introduce a new account-linking flow.
- Failed MCP integrations should be visible and diagnosable, but never fatal to unrelated Agent work.
