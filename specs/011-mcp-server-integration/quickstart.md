# Quickstart: MCP Server Integration

## Goal

Verify that a user can configure an MCP server, see tools become available, invoke a tool through normal permissions, and continue working when a server fails.

## Scenario 1: Local stdio server

1. Add a project MCP server entry named `filesystem` using local command transport.
2. Start a SuperAgent session in the project.
3. Confirm the server status is connected.
4. Confirm discovered tools appear with identities like `mcp__filesystem__read_file`.
5. Ask the Agent to use one discovered tool.
6. Confirm permission handling uses allow/ask/deny and displays server/tool identity.

## Scenario 2: Permission default

1. Configure a fake MCP server that exposes `write_file`.
2. Do not add any allow rule for the tool.
3. Ask the Agent to invoke it.
4. Confirm the decision defaults to ask.
5. Add an explicit allow rule for `mcp__fake__write_file`.
6. Confirm the tool can be auto-approved when policy permits.
7. Add a deny rule for the same tool.
8. Confirm deny wins over allow.

## Scenario 3: Failed server isolation

1. Configure one working MCP server and one broken MCP server.
2. Start a session.
3. Confirm the broken server is marked failed with a safe error.
4. Confirm the working server's tools and built-in tools remain usable.
5. Confirm logs contain connection failure without secrets.

## Scenario 4: Tool refresh

1. Start a fake MCP server with one tool.
2. Start SuperAgent and verify the tool is available.
3. Change the fake server tool list before the next turn.
4. Continue the Agent session.
5. Confirm the next turn reflects the updated tool list.
