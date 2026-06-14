# Research: MCP Server Integration

## Decision 1: Use official MCP SDK

**Decision:** Use `@modelcontextprotocol/sdk` for MCP client transports and protocol interaction.

**Rationale:** The project research baseline already selected the official SDK for MCP support. Using the official SDK reduces protocol drift and keeps SuperAgent aligned with the ecosystem standard.

**Alternatives considered:**
- Custom protocol implementation: rejected because it increases compatibility risk.
- Third-party wrapper framework: rejected for v1.1 because it adds abstractions before the project has its own MCP needs stabilized.

---

## Decision 2: Support stdio and Streamable HTTP only

**Decision:** Implement local command-based stdio servers and remote Streamable HTTP servers.

**Rationale:** These match the v1.1 scope and current MCP direction while covering local developer tools and remote hosted integrations.

**Alternatives considered:**
- SSE-only remote transport: rejected as a legacy path for this feature.
- WebSocket/custom transport: rejected because it is not required by the v1.1 plan.

---

## Decision 3: Use Claude Code-style MCP tool identity

**Decision:** Represent MCP tools as `mcp__<serverName>__<toolName>`.

**Rationale:** This matches known Claude Code conventions, makes tool origin visible, prevents collisions, and gives permission rules a stable string key.

**Alternatives considered:**
- `server.tool`: compact but less compatible with Claude-style rules.
- Tool name only: rejected because collisions and source ambiguity are unacceptable.

---

## Decision 4: Default MCP permission is ask

**Decision:** MCP tools enter the normal permission system, but unknown/newly discovered MCP tools default to `ask` unless an explicit allow/deny rule matches.

**Rationale:** MCP servers are external extension points. Server discovery should not imply execution trust. This also preserves the constitution rule that deny overrides auto-approve.

**Alternatives considered:**
- Inherit built-in tool defaults: rejected because external tool side effects are unknown.
- Default deny: safer but too much friction for the v1.1 community-tool goal.

---

## Decision 5: Keep MCP failures non-fatal

**Decision:** Failed server connect, refresh, or tool call returns localized failure state/error and does not terminate the Agent session.

**Rationale:** MCP expands capability but should not reduce reliability of the core coding loop. Built-in tools and other MCP servers must remain usable.

**Alternatives considered:**
- Fail startup if any configured server fails: rejected because optional integrations would make the CLI brittle.
- Silently ignore failures: rejected because users need actionable configuration feedback.

---

## Decision 6: Tool refresh between turns

**Decision:** Refresh MCP tool availability at startup and between Agent turns.

**Rationale:** This captures tool changes without mutating the active tool list mid-call and aligns with a stable turn lifecycle.

**Alternatives considered:**
- Refresh only at startup: simpler but misses dynamic server changes.
- Refresh continuously in the background: more complex and risks tool-list races during model calls.
