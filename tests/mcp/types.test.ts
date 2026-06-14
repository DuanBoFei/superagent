import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  McpCallResult,
  McpHttpServerConfig,
  McpSafeError,
  McpServerConfig,
  McpServerSession,
  McpServerState,
  McpStdioServerConfig,
  McpToolCall,
  McpToolDefinition,
} from "../../src/mcp/types";

describe("MCP domain types", () => {
  it("models stdio and http server config variants", () => {
    const stdio: McpStdioServerConfig = {
      enabled: true,
      transport: "stdio",
      command: "npx",
      args: ["-y", "server"],
      env: { TOKEN: "secret" },
    };
    const http: McpHttpServerConfig = {
      enabled: false,
      transport: "http",
      url: "https://example.invalid/mcp",
      headers: { Authorization: "Bearer token" },
    };

    expectTypeOf(stdio).toMatchTypeOf<McpServerConfig>();
    expectTypeOf(http).toMatchTypeOf<McpServerConfig>();
    expect(stdio.transport).toBe("stdio");
    expect(http.transport).toBe("http");
  });

  it("limits server state to the documented lifecycle", () => {
    const states: McpServerState[] = [
      "disabled",
      "connecting",
      "connected",
      "refreshing",
      "failed",
      "disconnected",
    ];

    expect(states).toHaveLength(6);
  });

  it("models server sessions with safe errors and discovered tools", () => {
    const lastError: McpSafeError = {
      code: "CONNECTION_FAILED",
      message: "Connection failed",
      detail: "command not found",
    };
    const session: McpServerSession = {
      serverName: "filesystem",
      state: "failed",
      lastError,
      tools: [],
      updatedAt: new Date("2026-06-14T00:00:00.000Z"),
    };

    expect(session.lastError?.message).toBe("Connection failed");
  });

  it("models tool definitions with permission keys and input schema", () => {
    const tool: McpToolDefinition = {
      serverName: "filesystem",
      toolName: "read_file",
      permissionKey: "mcp__filesystem__read_file",
      description: "Read a file",
      inputSchema: { type: "object", properties: { path: { type: "string" } } },
      isAvailable: true,
    };

    expect(tool.permissionKey).toBe("mcp__filesystem__read_file");
  });

  it("models tool calls with normalized success or safe error results", () => {
    const success: McpCallResult = {
      ok: true,
      content: [{ type: "text", text: "done" }],
    };
    const failure: McpCallResult = {
      ok: false,
      error: { code: "TOOL_TIMEOUT", message: "Tool timed out" },
    };
    const call: McpToolCall = {
      serverName: "filesystem",
      toolName: "read_file",
      permissionKey: "mcp__filesystem__read_file",
      permissionDecision: "allow",
      input: { path: "README.md" },
      result: success,
      durationMs: 12,
      success: true,
    };

    expect(call.result.ok).toBe(true);
    expect(failure.error.message).toBe("Tool timed out");
  });
});
