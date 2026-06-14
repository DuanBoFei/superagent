import { describe, expect, it, vi } from "vitest";
import { defaults } from "../../src/config/defaults";
import type { McpManager } from "../../src/mcp/manager";
import type { McpToolDefinition } from "../../src/mcp/types";
import { createRuntime } from "../../src/runtime/runtime";
import type { Token, TurnEvent } from "../../src/runtime/types";

function tool(permissionKey: string, toolName: string): McpToolDefinition {
  return {
    serverName: "filesystem",
    toolName,
    permissionKey,
    description: toolName,
    inputSchema: { type: "object" },
    isAvailable: true,
  };
}

function manager(listTools: () => McpToolDefinition[], overrides: Partial<McpManager> = {}): McpManager {
  return {
    connectAll: vi.fn(async () => undefined),
    refreshTools: vi.fn(async () => undefined),
    listTools: vi.fn(listTools),
    getSession: vi.fn((serverName: string) => ({
      serverName,
      state: "connected",
      tools: listTools(),
      updatedAt: new Date(),
    })),
    getSessions: vi.fn(() => [
      {
        serverName: "filesystem",
        state: "connected",
        tools: listTools(),
        updatedAt: new Date(),
      },
    ]),
    callTool: vi.fn(async (_serverName, toolName) => ({ ok: true, content: [{ type: "text", text: toolName }] })),
    close: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function collect(stream: AsyncGenerator<TurnEvent>): Promise<TurnEvent[]> {
  const events: TurnEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

describe("MCP between-turn refresh", () => {
  it("refreshes MCP tools before later turns and removes stale tools", async () => {
    let tools = [tool("mcp__filesystem__read_file", "read-file")];
    const mcp = manager(() => tools);
    const responses: Token[][] = [
      [
        {
          type: "tool_use",
          name: "mcp__filesystem__read_file",
          arguments: "{}",
        },
      ],
      [{ type: "text", content: "first done" }],
      [
        {
          type: "tool_use",
          name: "mcp__filesystem__write_file",
          arguments: "{}",
        },
      ],
      [{ type: "text", content: "second done" }],
    ];
    async function* model(): AsyncGenerator<Token> {
      for (const token of responses.shift() ?? []) {
        yield token;
      }
    }

    const runtime = createRuntime({
      config: {
        ...defaults,
        permissions: { ...defaults.permissions, autoApprove: ["mcp__filesystem__*"] },
      },
      mcpManager: mcp,
      sendMessage: model,
    });

    const firstTurn = await collect(runtime.startTurn("first"));
    tools = [tool("mcp__filesystem__write_file", "write-file")];
    const secondTurn = await collect(runtime.startTurn("second"));

    expect(mcp.refreshTools).toHaveBeenCalledWith("filesystem");
    expect(firstTurn).toContainEqual({
      type: "tool_result",
      name: "mcp__filesystem__read_file",
      success: true,
      summary: "read-file",
    });
    expect(secondTurn).toContainEqual({
      type: "tool_result",
      name: "mcp__filesystem__write_file",
      success: true,
      summary: "write-file",
    });
  });

  it("continues a turn when MCP refresh fails", async () => {
    const mcp = manager(() => [tool("mcp__filesystem__read_file", "read-file")], {
      refreshTools: vi.fn(async () => {
        throw new Error("refresh failed");
      }),
    });
    async function* model(): AsyncGenerator<Token> {
      yield { type: "text", content: "still works" };
    }

    const runtime = createRuntime({
      config: defaults,
      mcpManager: mcp,
      sendMessage: model,
    });

    const events = await collect(runtime.startTurn("hello"));

    expect(events).toContainEqual({ type: "text", content: "still works" });
    expect(events.find((event) => event.type === "turn_end")).toBeDefined();
  });
});
