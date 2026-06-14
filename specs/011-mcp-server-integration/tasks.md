# Tasks: MCP Server Integration

## Task Summary

14 tasks · TDD-first · 4 user-story phases · estimated 2-3 days

All tasks follow the Spec-Kit checklist format and include the project-required metadata:
- `[BE]` backend/module work
- `[INT]` integration/runtime flow work
- Source: FR/AC references from `spec.md`
- Dependencies: prerequisite task IDs
- Verification: concrete test or command

---

## Phase 1: Setup & Contracts

### Goal

Establish the MCP dependency and write contract-level tests before implementation.

- [x] T001 [BE] Add MCP SDK dependency and config contract tests in package.json and tests/config/mcp-config.test.ts

| | |
|---|---|
| **Source** | FR-MCP-01, FR-MCP-02, FR-MCP-03, FR-MCP-04; Contract `mcp-config.md` validation rules |
| **Dependencies** | None |
| **Verification** | `pnpm test -- tests/config/mcp-config.test.ts` initially fails for missing `mcpServers` support, then passes after T006 |

Create failing tests for:
- omitted `mcpServers` starts with empty config
- disabled server is preserved but not connected
- stdio server without `command` fails validation
- http server without `url` fails validation
- unknown transport fails validation
- later config layer overrides duplicate server names

---

## Phase 2: Foundational Types & Unit Tests

### Goal

Define typed MCP domain boundaries and red tests for identity, permission, and safe errors before runtime implementation.

- [x] T002 [P] [BE] Define MCP domain types in src/mcp/types.ts and tests/mcp/types.test.ts

| | |
|---|---|
| **Source** | FR-MCP-01, FR-MCP-05, FR-MCP-06, FR-MCP-10, FR-MCP-11; Data Model §MCP Server Config/Session/Tool/Call |
| **Dependencies** | None |
| **Verification** | `pnpm typecheck`; `pnpm test -- tests/mcp/types.test.ts` |

Define typed shapes for:
- `McpServerConfig` with `stdio` and `http` variants
- `McpServerState`: `disabled`, `connecting`, `connected`, `refreshing`, `failed`, `disconnected`
- `McpToolDefinition`
- `McpToolCall`
- normalized safe error/result shapes

- [x] T003 [P] [BE] Add MCP tool identity tests and helpers in tests/mcp/tool-names.test.ts and src/mcp/tool-names.ts

| | |
|---|---|
| **Source** | FR-MCP-05, FR-MCP-06, FR-MCP-07A; Data Model §Identity Rules; Contract permission keys |
| **Dependencies** | T002 |
| **Verification** | `pnpm test -- tests/mcp/tool-names.test.ts` |

Test and implement:
- `mcp__<serverName>__<toolName>` generation
- server/tool normalization before building permission keys
- rejection of empty or unsafe names
- parsing generated keys back to server/tool parts
- no collision with built-in tool names because of `mcp__` prefix

- [x] T004 [P] [BE] Add MCP permission matching tests in tests/mcp/permissions.test.ts

| | |
|---|---|
| **Source** | FR-MCP-07, FR-MCP-07A; AC-MCP-03; Contract permission evaluation rules |
| **Dependencies** | T003 |
| **Verification** | `pnpm test -- tests/mcp/permissions.test.ts` initially fails, then passes after T007 |

Cover:
- `mcp__*` matches all MCP tools
- `mcp__server__*` matches all tools from one server
- `mcp__server__tool` matches one tool
- deny rules win over allow rules
- explicit allow returns allow
- explicit ask returns ask
- no matching MCP rule defaults to ask

- [x] T005 [P] [BE] Add MCP safe error and redaction tests in tests/mcp/errors.test.ts and src/mcp/errors.ts

| | |
|---|---|
| **Source** | FR-MCP-08, FR-MCP-11; Boundary Conditions: command not found, remote unreachable, oversized output, secret-like values |
| **Dependencies** | T002 |
| **Verification** | `pnpm test -- tests/mcp/errors.test.ts` |

Test and implement:
- user-safe connection error summaries
- redaction for env/header secret-like values
- tool timeout/malformed output safe errors
- oversized result truncation with explicit truncation marker
- no secret leakage in returned error text

---

## Phase 3: User Story 1 — Configure and Connect MCP Servers

### Goal

A developer can configure local and remote MCP servers and have SuperAgent connect at session startup.

### Independent Test Criteria

A fake stdio server and a fake HTTP transport can be configured; enabled servers connect, disabled servers remain disabled, and broken servers are marked failed without crashing startup.

- [x] T006 [BE] [US1] Implement mcpServers config schema and defaults in src/config/types.ts, src/config/defaults.ts, and src/config/validator.ts

| | |
|---|---|
| **Source** | FR-MCP-01, FR-MCP-02; AC-MCP-01, AC-MCP-02; Contract validation rules |
| **Dependencies** | T001, T002 |
| **Verification** | `pnpm test -- tests/config/mcp-config.test.ts`; `pnpm typecheck` |

Add `mcpServers` to layered config with default `{}` and validation for:
- non-empty safe server names
- enabled defaulting to true when an entry exists
- stdio requiring `command`
- http requiring `url`
- unknown transport rejected

- [x] T007 [BE] [US1] Implement MCP permission matcher integration in src/permissions/matcher.ts and src/permissions/checker.ts

| | |
|---|---|
| **Source** | FR-MCP-07, FR-MCP-07A; AC-MCP-03; Clarification 2026-06-14 |
| **Dependencies** | T003, T004 |
| **Verification** | `pnpm test -- tests/mcp/permissions.test.ts`; existing permission tests still pass |

Integrate MCP permission keys into the existing permission pipeline without changing built-in tool behavior.

- [x] T008 [BE] [US1] Implement MCP transport builders in src/mcp/transports.ts

| | |
|---|---|
| **Source** | FR-MCP-03, FR-MCP-04; Research Decision 2; Plan §Transport scope |
| **Dependencies** | T002, T005, T006 |
| **Verification** | `pnpm test -- tests/mcp/transports.test.ts`; no public network dependency |

Build transport construction for:
- stdio command/args/env configs
- Streamable HTTP url/headers configs
- safe validation errors from malformed configs
- redacted diagnostic summaries

- [ ] T009 [BE] [US1] Implement MCP manager connection lifecycle in src/mcp/manager.ts and src/mcp/index.ts

| | |
|---|---|
| **Source** | FR-MCP-03, FR-MCP-04, FR-MCP-08, FR-MCP-09; AC-MCP-01, AC-MCP-02, AC-MCP-04 |
| **Dependencies** | T005, T008 |
| **Verification** | `pnpm test -- tests/mcp/manager.test.ts` |

Implement manager behavior:
- initialize sessions from enabled/disabled config
- connect enabled servers at startup
- mark disabled servers `disabled`
- mark failed connections `failed` with safe `lastError`
- keep other servers usable when one fails
- expose session status and discovered tools
- close active sessions on shutdown

---

## Phase 4: User Story 2 — Discover, Name, and Adapt MCP Tools

### Goal

Connected server tools become SuperAgent-callable tools with stable, server-qualified identities.

### Independent Test Criteria

A fake connected server exposing two tools produces deterministic SuperAgent tool definitions named `mcp__server__tool`, with description and input schema preserved.

- [ ] T010 [BE] [US2] Implement MCP tool adapter in src/mcp/tool-adapter.ts

| | |
|---|---|
| **Source** | FR-MCP-05, FR-MCP-06, FR-MCP-11; AC-MCP-03 |
| **Dependencies** | T003, T005, T009 |
| **Verification** | `pnpm test -- tests/mcp/tool-adapter.test.ts` |

Convert MCP tool definitions into existing SuperAgent tool shape:
- stable `name` from `mcp__server__tool`
- user/model-visible description including server/tool identity
- input schema passed through safely
- execution delegates to `McpManager.callTool`
- malformed/failed results normalize to safe tool results

- [ ] T011 [INT] [US2] Extend tool registry for deterministic built-in plus MCP tools in src/tools/registry.ts

| | |
|---|---|
| **Source** | FR-MCP-05, FR-MCP-06, FR-MCP-10; AC-MCP-05; Plan Risk R2 |
| **Dependencies** | T010 |
| **Verification** | `pnpm test -- tests/mcp/tool-registry.test.ts`; existing tool registry tests still pass |

Update registry behavior so:
- built-in tool order stays stable
- MCP tools append deterministically by server/tool name
- unavailable MCP tools are excluded or marked unavailable according to existing tool conventions
- duplicate raw tool names across servers remain distinct

---

## Phase 5: User Story 3 — Invoke MCP Tools Through Permissions and Runtime

### Goal

Agent-requested MCP tool calls execute through the same permission and dispatch path as built-in tools.

### Independent Test Criteria

An available fake MCP tool defaults to ask, can be explicitly allowed, and is denied when a deny rule also matches.

- [ ] T012 [INT] [US3] Wire MCP manager into runtime startup and tool dispatch in src/runtime/runtime.ts and src/runtime/tool-dispatcher.ts

| | |
|---|---|
| **Source** | FR-MCP-03, FR-MCP-04, FR-MCP-07, FR-MCP-09; AC-MCP-01, AC-MCP-02, AC-MCP-03, AC-MCP-04 |
| **Dependencies** | T007, T009, T010, T011 |
| **Verification** | `pnpm test -- tests/mcp/integration.test.ts` |

Wire runtime so:
- session startup creates one `McpManager`
- enabled servers connect before first tool context is built
- adapted MCP tools enter normal dispatcher flow
- permission decision uses the MCP permission key
- denied/asked outcomes match built-in permission behavior
- failed servers do not block built-in tools

---

## Phase 6: User Story 4 — Refresh Tools and Observe MCP Activity

### Goal

Tool availability changes between turns and MCP lifecycle/tool events are visible in observability without leaking secrets.

### Independent Test Criteria

A fake server changing its tool list between turns is reflected on the next turn, and connection/tool-call events appear in structured logs with redacted details.

- [ ] T013 [INT] [US4] Add between-turn MCP tool refresh in src/runtime/query-loop.ts

| | |
|---|---|
| **Source** | FR-MCP-10; AC-MCP-05; Quickstart Scenario 4 |
| **Dependencies** | T009, T011, T012 |
| **Verification** | `pnpm test -- tests/runtime/mcp-refresh.test.ts` |

Implement refresh lifecycle:
- refresh tools after startup and between Agent turns
- mark refreshing state during refresh
- update tool list on success
- mark server failed on refresh failure without crashing turn loop
- removed tools are not offered in later turns

- [ ] T014 [INT] [US4] Add MCP observability events and end-to-end fake server coverage in src/observability/types.ts and tests/mcp/integration.test.ts

| | |
|---|---|
| **Source** | FR-MCP-08, FR-MCP-09, FR-MCP-12; AC-MCP-04; Quickstart Scenarios 1-3; Plan §Observability Events |
| **Dependencies** | T005, T012, T013 |
| **Verification** | `pnpm test -- tests/mcp/integration.test.ts tests/runtime/mcp-refresh.test.ts`; `pnpm test -- tests/observability` |

Add and verify events:
- `mcp:server_connect_start`
- `mcp:server_connect_end`
- `mcp:tools_refresh`
- `mcp:tool_start`
- `mcp:tool_end`

End-to-end coverage must verify:
- local fake stdio server connects and exposes a tool
- one broken server is isolated from one working server
- MCP tool call events include `serverName`, `toolName`, `permissionKey`, duration, success/failure
- logs/errors redact env/header secrets

---

## Dependencies

```text
T001 ─┬─ T006 ─┬─ T008 ─ T009 ─ T010 ─ T011 ─ T012 ─ T013 ─ T014
      │        │
T002 ─┼─ T003 ─┴─ T004 ─ T007 ────────────────┘
      └─ T005 ────────┘
```

## Parallel Execution Examples

### After T001/T002 baseline

```text
Parallel group A:
- T003 tool identity helpers
- T005 safe error/redaction helpers

Parallel group B:
- T004 permission tests after T003
- T006 config schema after T001/T002
```

### After manager is available

```text
Parallel group C:
- T010 tool adapter
- additional manager edge-case tests in T009
```

## Implementation Strategy

1. **Contract first**: T001-T005 create failing tests and typed boundaries before runtime code.
2. **MVP path**: T006-T012 delivers configurable MCP servers, tool discovery, permission default ask, and invocation.
3. **Hardening path**: T013-T014 adds refresh, observability, broken-server isolation, and redaction coverage.
4. **Stop point**: Do not implement marketplace, OAuth/account linking UI, MCP resources/prompts, or browser automation in this feature.
