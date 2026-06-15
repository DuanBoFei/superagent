import { describe, expect, it, vi } from "vitest";
import { defaults } from "../../src/config/defaults";
import { createMcpManager, type McpClientLike, type McpManager } from "../../src/mcp/manager";
import type { McpServerConfig } from "../../src/mcp/types";
import type { LogEvent } from "../../src/observability/types";
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

class FakeMcpClient implements McpClientLike {
  constructor(
    private readonly toolName: string,
    private readonly output: string,
  ) {}

  async connect(): Promise<void> {}

  async listTools() {
    return {
      tools: [
        {
          name: this.toolName,
          description: this.toolName,
          inputSchema: { type: "object" },
        },
      ],
    };
  }

  async callTool() {
    return { content: [{ type: "text" as const, text: this.output }] };
  }

  async close(): Promise<void> {}
}

function stdioServer(command: string, env: Record<string, string> = {}): McpServerConfig {
  return {
    enabled: true,
    transport: "stdio",
    command,
    args: [],
    env,
  };
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

  it("emits MCP lifecycle and tool events while isolating broken servers", async () => {
    const observed: LogEvent[] = [];
    const mcp = createMcpManager(
      {
        filesystem: stdioServer("fake-filesystem"),
        broken: stdioServer("missing-secret-server", { API_KEY: "sk-secret-value" }),
      },
      {
        createClient: (serverName) => {
          if (serverName === "broken") throw new Error("API_KEY=sk-secret-value");
          return new FakeMcpClient("read-file", "file content");
        },
        createTransport: (_serverName, config) => ({
          ok: true,
          transport: { start: async () => undefined, close: async () => undefined } as never,
          diagnostic: JSON.stringify(config),
        }),
      },
    );
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
          filesystem: stdioServer("fake-filesystem"),
          broken: stdioServer("missing-secret-server", { API_KEY: "sk-secret-value" }),
        },
      },
      mcpManager: mcp,
      sendMessage: model,
      emit: (event) => observed.push(event),
    });

    const events = await collect(runtime.startTurn("read via mcp"));

    expect(events).toContainEqual({
      type: "tool_result",
      name: "mcp__filesystem__read_file",
      success: true,
      summary: "file content",
    });
    expect(observed).toContainEqual({ type: "mcp:server_connect_start", serverName: "filesystem" });
    expect(observed).toContainEqual({ type: "mcp:server_connect_start", serverName: "broken" });
    expect(observed).toContainEqual(
      expect.objectContaining({
        type: "mcp:server_connect_end",
        serverName: "filesystem",
        success: true,
      }),
    );
    expect(observed).toContainEqual(
      expect.objectContaining({
        type: "mcp:server_connect_end",
        serverName: "broken",
        success: false,
        error: expect.not.stringContaining("sk-secret-value"),
      }),
    );
    expect(observed).toContainEqual(
      expect.objectContaining({
        type: "mcp:tools_refresh",
        serverName: "filesystem",
        success: true,
      }),
    );
    expect(observed).toContainEqual(
      expect.objectContaining({
        type: "mcp:tool_start",
        serverName: "filesystem",
        toolName: "read-file",
        permissionKey: "mcp__filesystem__read_file",
      }),
    );
    expect(observed).toContainEqual(
      expect.objectContaining({
        type: "mcp:tool_end",
        serverName: "filesystem",
        toolName: "read-file",
        permissionKey: "mcp__filesystem__read_file",
        success: true,
        durationMs: expect.any(Number),
      }),
    );
  });
});
