import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { getConfig } from "../../src/config/config";
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

function httpServer(url: string, headers: Record<string, string> = {}): McpServerConfig {
  return {
    enabled: true,
    transport: "http",
    url,
    headers,
  };
}

function startHttpMcpServer(): Promise<{ url: string; close: () => Promise<void>; seenAuthorization: () => string | undefined }> {
  let authorization: string | undefined;
  const server = createServer((request, response) => {
    authorization = request.headers.authorization;
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      const message = JSON.parse(body) as { id: number; method: string };
      response.setHeader("content-type", "application/json");
      if (message.method === "initialize") {
        response.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "http-smoke", version: "1.0.0" } } }));
        return;
      }
      if (message.method === "tools/list") {
        response.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { tools: [{ name: "ping", description: "Ping", inputSchema: { type: "object" } }] } }));
        return;
      }
      if (message.method === "tools/call") {
        response.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: "pong" }] } }));
        return;
      }
      response.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: {} }));
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address !== "object" || address === null) throw new Error("expected TCP address");
      resolve({
        url: `http://127.0.0.1:${address.port}/mcp`,
        close: () => closeServer(server),
        seenAuthorization: () => authorization,
      });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
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

  it("connects to a real Streamable HTTP MCP endpoint and preserves configured headers", async () => {
    const server = await startHttpMcpServer();
    try {
      const mcp = createMcpManager({ remote: httpServer(server.url, { Authorization: "Bearer test-token" }) });

      await mcp.connectAll();
      const tools = mcp.listTools();
      const result = await mcp.callTool("remote", "ping", {});

      expect(tools).toContainEqual(
        expect.objectContaining({
          serverName: "remote",
          toolName: "ping",
          permissionKey: "mcp__remote__ping",
          isAvailable: true,
        }),
      );
      expect(result).toEqual({ ok: true, content: [{ type: "text", text: "pong" }], metadata: undefined });
      expect(server.seenAuthorization()).toBe("Bearer test-token");
      await mcp.close();
    } finally {
      await server.close();
    }
  });

  it("connects to a real stdio MCP subprocess and calls its discovered tool", async () => {
    const root = mkdtempSync(join(tmpdir(), "mcp-stdio-"));
    const serverPath = join(root, "server.mjs");

    try {
      const sdkRoot = join(process.cwd(), "node_modules", "@modelcontextprotocol", "sdk", "dist", "esm");
      const mcpServerUrl = pathToFileURL(join(sdkRoot, "server", "mcp.js")).href;
      const stdioTransportUrl = pathToFileURL(join(sdkRoot, "server", "stdio.js")).href;
      writeFileSync(
        serverPath,
        `import { McpServer } from "${mcpServerUrl}";\nimport { StdioServerTransport } from "${stdioTransportUrl}";\nconst server = new McpServer({ name: "stdio-smoke", version: "1.0.0" });\nserver.registerTool("echo", { description: "Echo" }, async () => ({ content: [{ type: "text", text: "hello stdio" }] }));\nawait server.connect(new StdioServerTransport());\n`,
      );
      const mcp = createMcpManager({ local: { enabled: true, transport: "stdio", command: process.execPath, args: [serverPath], env: {} } });

      await mcp.connectAll();
      const session = mcp.getSession("local");
      const tools = mcp.listTools();
      const result = await mcp.callTool("local", "echo", { text: "hello stdio" });

      expect(session).toEqual(expect.objectContaining({ state: "connected" }));
      expect(tools).toContainEqual(
        expect.objectContaining({
          serverName: "local",
          toolName: "echo",
          permissionKey: "mcp__local__echo",
          isAvailable: true,
        }),
      );
      expect(result).toEqual({ ok: true, content: [{ type: "text", text: "hello stdio" }], metadata: undefined });
      await mcp.close();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("loads layered config into runtime and dispatches a configured MCP tool with observability", async () => {
    const root = mkdtempSync(join(tmpdir(), "mcp-full-chain-"));
    const globalDir = join(root, "global");
    const projectDir = join(root, "project");
    const observed: LogEvent[] = [];

    try {
      mkdirSync(globalDir);
      mkdirSync(projectDir);
      writeFileSync(join(globalDir, "settings.json"), JSON.stringify({ mcpServers: { tools: stdioServer("global-tools") } }));
      writeFileSync(
        join(projectDir, "settings.json"),
        JSON.stringify({
          apiKey: "sk-test",
          permissions: { autoApprove: ["mcp__tools__read_file"], deny: [], askTimeout: 30 },
          mcpServers: { tools: stdioServer("project-tools") },
        }),
      );

      const { config } = getConfig({ globalConfigDir: globalDir, projectConfigDir: projectDir, env: {} });
      const mcp = createMcpManager(config.mcpServers, {
        createClient: () => new FakeMcpClient("read-file", "configured content"),
        createTransport: (_serverName, mcpConfig) => ({
          ok: true,
          transport: { start: async () => undefined, close: async () => undefined } as never,
          diagnostic: JSON.stringify(mcpConfig),
        }),
      });
      let calls = 0;
      async function* model(): AsyncGenerator<Token> {
        calls++;
        if (calls === 1) {
          yield { type: "tool_use", name: "mcp__tools__read_file", arguments: JSON.stringify({ path: "README.md" }) };
        } else {
          yield { type: "text", content: "done" };
        }
      }

      const runtime = createRuntime({
        config,
        mcpManager: mcp,
        sendMessage: model,
        emit: (event) => observed.push(event),
      });

      const events = await collect(runtime.startTurn("use configured mcp"));

      expect(config.mcpServers.tools).toEqual(stdioServer("project-tools"));
      expect(events).toContainEqual({
        type: "tool_result",
        name: "mcp__tools__read_file",
        success: true,
        summary: "configured content",
      });
      expect(observed).toContainEqual(expect.objectContaining({ type: "mcp:server_connect_end", serverName: "tools", success: true }));
      expect(observed).toContainEqual(expect.objectContaining({ type: "mcp:tool_end", serverName: "tools", toolName: "read-file", permissionKey: "mcp__tools__read_file", success: true }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
