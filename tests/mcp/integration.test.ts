import { describe, expect, it, vi } from "vitest";
import { defaults } from "../../src/config/defaults";
import type { McpManager } from "../../src/mcp/manager";
import { createRuntime } from "../../src/runtime/runtime";
import type { Token, TurnEvent } from "../../src/runtime/types";

function manager(overrides: Partial<McpManager> = {}): McpManager {
  return {
    connectAll: vi.fn(async () => undefined),
    refreshTools: vi.fn(async () => undefined),
    listTools: vi.fn(() => [
      {
        serverName: "filesystem",
        toolName: "read-file",
        permissionKey: "mcp__filesystem__read_file",
        description: "Read file",
        inputSchema: { type: "object" },
        isAvailable: true,
      },
    ]),
    getSession: vi.fn(() => undefined),
    getSessions: vi.fn(() => []),
    callTool: vi.fn(async () => ({ ok: true, content: [{ type: "text", text: "file content" }] })),
    close: vi.fn(async () => undefined),
    ...overrides,
  };
}

async function collect(stream: AsyncGenerator<TurnEvent>): Promise<TurnEvent[]> {
  const events: TurnEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

describe("MCP runtime integration", () => {
  it("connects MCP servers before dispatching MCP tools", async () => {
    const mcp = manager();
    let calls = 0;
    async function* model(): AsyncGenerator<Token> {
      calls++;
      if (calls === 1) {
        yield {
          type: "tool_use",
          name: "mcp__filesystem__read_file",
          arguments: JSON.stringify({ path: "README.md" }),
        };
      } else {
        yield { type: "text", content: "done" };
      }
    }

    const runtime = createRuntime({
      config: {
        ...defaults,
        permissions: { ...defaults.permissions, autoApprove: ["mcp__filesystem__read_file"] },
        mcpServers: {
          filesystem: {
            enabled: true,
            transport: "stdio",
            command: "fake-mcp",
            args: [],
            env: {},
          },
        },
      },
      mcpManager: mcp,
      sendMessage: model,
    });

    const events = await collect(runtime.startTurn("read via mcp"));

    expect(mcp.connectAll).toHaveBeenCalled();
    expect(mcp.callTool).toHaveBeenCalledWith("filesystem", "read-file", { path: "README.md" });
    expect(vi.mocked(mcp.connectAll).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(mcp.callTool).mock.invocationCallOrder[0]!,
    );
    expect(events).toContainEqual({
      type: "tool_result",
      name: "mcp__filesystem__read_file",
      success: true,
      summary: "file content",
    });
  });

  it("denies MCP tools when a deny rule matches", async () => {
    const mcp = manager();
    async function* model(): AsyncGenerator<Token> {
      yield {
        type: "tool_use",
        name: "mcp__filesystem__read_file",
        arguments: JSON.stringify({ path: "README.md" }),
      };
    }

    const runtime = createRuntime({
      config: {
        ...defaults,
        permissions: {
          ...defaults.permissions,
          autoApprove: ["mcp__filesystem__*"],
          deny: ["mcp__filesystem__read_file"],
        },
      },
      mcpManager: mcp,
      sendMessage: model,
    });

    const events = await collect(runtime.startTurn("read via mcp"));

    expect(mcp.callTool).not.toHaveBeenCalled();
    expect(events).toContainEqual({
      type: "tool_result",
      name: "mcp__filesystem__read_file",
      success: false,
      summary: "",
    });
  });
});
