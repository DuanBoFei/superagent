import { describe, expect, it, vi } from "vitest";
import { createMcpManager, type McpClientLike } from "../../src/mcp/manager";
import type { McpServerConfig } from "../../src/mcp/types";

function stdioConfig(overrides: Partial<McpServerConfig> = {}): McpServerConfig {
  return {
    enabled: true,
    transport: "stdio",
    command: "node",
    args: [],
    env: {},
    ...overrides,
  } as McpServerConfig;
}

function fakeClient(overrides: Partial<McpClientLike> = {}): McpClientLike {
  return {
    connect: vi.fn(async () => undefined),
    listTools: vi.fn(async () => ({ tools: [] })),
    callTool: vi.fn(async () => ({ content: [{ type: "text", text: "ok" }] })),
    close: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("MCP manager lifecycle", () => {
  it("initializes disabled sessions without connecting", async () => {
    const client = fakeClient();
    const manager = createMcpManager(
      { filesystem: stdioConfig({ enabled: false }) },
      { createClient: () => client },
    );

    await manager.connectAll();

    expect(client.connect).not.toHaveBeenCalled();
    expect(manager.getSession("filesystem")?.state).toBe("disabled");
  });

  it("connects enabled servers and exposes discovered tools", async () => {
    const client = fakeClient({
      listTools: vi.fn(async () => ({
        tools: [
          {
            name: "read-file",
            description: "Read a file",
            inputSchema: { type: "object", properties: { path: { type: "string" } } },
          },
        ],
      })),
    });
    const manager = createMcpManager(
      { filesystem: stdioConfig() },
      { createClient: () => client },
    );

    await manager.connectAll();

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(manager.getSession("filesystem")?.state).toBe("connected");
    expect(manager.listTools()).toEqual([
      {
        serverName: "filesystem",
        toolName: "read-file",
        permissionKey: "mcp__filesystem__read_file",
        description: "Read a file",
        inputSchema: { type: "object", properties: { path: { type: "string" } } },
        isAvailable: true,
      },
    ]);
  });

  it("marks failed connections with safe errors and keeps other servers usable", async () => {
    const working = fakeClient({
      listTools: vi.fn(async () => ({
        tools: [{ name: "status", inputSchema: { type: "object" } }],
      })),
    });
    const broken = fakeClient({
      connect: vi.fn(async () => {
        throw new Error("Authorization: Bearer secret-token");
      }),
    });
    const manager = createMcpManager(
      { working: stdioConfig(), broken: stdioConfig() },
      { createClient: (serverName) => (serverName === "working" ? working : broken) },
    );

    await manager.connectAll();

    expect(manager.getSession("working")?.state).toBe("connected");
    const failed = manager.getSession("broken");
    expect(failed?.state).toBe("failed");
    expect(failed?.lastError?.message).toBe("Connection failed");
    expect(failed?.lastError?.detail).toContain("[REDACTED]");
    expect(failed?.lastError?.detail).not.toContain("secret-token");
    expect(manager.listTools().map((tool) => tool.permissionKey)).toEqual(["mcp__working__status"]);
  });

  it("delegates tool calls to the connected server", async () => {
    const client = fakeClient();
    const manager = createMcpManager(
      { filesystem: stdioConfig() },
      { createClient: () => client },
    );
    await manager.connectAll();

    const result = await manager.callTool("filesystem", "read-file", { path: "README.md" });

    expect(client.callTool).toHaveBeenCalledWith({ name: "read-file", arguments: { path: "README.md" } });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful call");
    expect(result.content).toEqual([{ type: "text", text: "ok" }]);
  });

  it("returns safe errors for unavailable tool calls", async () => {
    const manager = createMcpManager({ filesystem: stdioConfig({ enabled: false }) });
    await manager.connectAll();

    const result = await manager.callTool("filesystem", "read-file", {});

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed call");
    expect(result.error.message).toBe("Connection failed");
    expect(result.error.detail).toContain("not connected");
  });

  it("closes active sessions on shutdown", async () => {
    const client = fakeClient();
    const manager = createMcpManager(
      { filesystem: stdioConfig() },
      { createClient: () => client },
    );
    await manager.connectAll();

    await manager.close();

    expect(client.close).toHaveBeenCalledTimes(1);
    expect(manager.getSession("filesystem")?.state).toBe("disconnected");
  });
});
