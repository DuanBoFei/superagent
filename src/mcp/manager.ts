import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { CallToolResult, ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import { createSafeMcpError } from "./errors";
import { buildMcpToolName } from "./tool-names";
import { createMcpTransport } from "./transports";
import type { McpCallResult, McpServerConfig, McpServerSession, McpToolDefinition } from "./types";

export interface McpClientLike {
  connect(transport: Transport): Promise<void>;
  listTools(): Promise<Pick<ListToolsResult, "tools">>;
  callTool(params: { name: string; arguments: Record<string, unknown> }): Promise<CallToolResult>;
  close(): Promise<void>;
}

export interface McpManagerOptions {
  createClient?: (serverName: string) => McpClientLike;
  createTransport?: (serverName: string, config: McpServerConfig) => ReturnType<typeof createMcpTransport>;
  now?: () => Date;
}

interface ManagedSession {
  publicSession: McpServerSession;
  config: McpServerConfig;
  client?: McpClientLike;
}

export interface McpManager {
  connectAll(): Promise<void>;
  refreshTools(serverName: string): Promise<void>;
  listTools(): McpToolDefinition[];
  getSession(serverName: string): McpServerSession | undefined;
  getSessions(): McpServerSession[];
  callTool(serverName: string, toolName: string, input: Record<string, unknown>): Promise<McpCallResult>;
  close(): Promise<void>;
}

export function createMcpManager(
  configs: Record<string, McpServerConfig>,
  options: McpManagerOptions = {},
): McpManager {
  const now = options.now ?? (() => new Date());
  const createClient =
    options.createClient ??
    (() => new Client({ name: "superagent", version: "0.1.0" }) as unknown as McpClientLike);
  const createTransport = options.createTransport ?? createMcpTransport;
  const sessions = new Map<string, ManagedSession>();

  for (const [serverName, config] of Object.entries(configs)) {
    sessions.set(serverName, {
      config,
      publicSession: {
        serverName,
        state: config.enabled ? "disconnected" : "disabled",
        tools: [],
        updatedAt: now(),
      },
    });
  }

  async function connectSession(session: ManagedSession): Promise<void> {
    if (!session.config.enabled) {
      updateSession(session, { state: "disabled", tools: [] });
      return;
    }

    updateSession(session, { state: "connecting", lastError: undefined });
    try {
      const transport = createTransport(session.publicSession.serverName, session.config);
      if (!transport.ok) {
        throw new Error(transport.error.detail ?? transport.error.message);
      }

      const client = createClient(session.publicSession.serverName);
      await client.connect(transport.transport);
      session.client = client;
      const tools = await discoverTools(session.publicSession.serverName, client);
      updateSession(session, {
        state: "connected",
        connectedAt: now(),
        tools,
        lastError: undefined,
      });
    } catch (error) {
      updateSession(session, {
        state: "failed",
        tools: [],
        lastError: createSafeMcpError("CONNECTION_FAILED", error),
      });
    }
  }

  async function refreshTools(serverName: string): Promise<void> {
    const session = sessions.get(serverName);
    if (!session) return;
    if (!session.client || session.publicSession.state === "disabled") return;

    updateSession(session, { state: "refreshing" });
    try {
      const tools = await discoverTools(serverName, session.client);
      updateSession(session, { state: "connected", tools, lastError: undefined });
    } catch (error) {
      updateSession(session, {
        state: "failed",
        tools: [],
        lastError: createSafeMcpError("CONNECTION_FAILED", error),
      });
    }
  }

  return {
    async connectAll() {
      await Promise.all(Array.from(sessions.values(), connectSession));
    },
    refreshTools,
    listTools() {
      return Array.from(sessions.values()).flatMap((session) => session.publicSession.tools);
    },
    getSession(serverName: string) {
      return sessions.get(serverName)?.publicSession;
    },
    getSessions() {
      return Array.from(sessions.values()).map((session) => session.publicSession);
    },
    async callTool(serverName: string, toolName: string, input: Record<string, unknown>) {
      const session = sessions.get(serverName);
      if (!session?.client || session.publicSession.state !== "connected") {
        return { ok: false, error: createSafeMcpError("CONNECTION_FAILED", `${serverName} is not connected`) };
      }

      try {
        const result = await session.client.callTool({ name: toolName, arguments: input });
        if (result.isError) {
          return { ok: false, error: createSafeMcpError("MALFORMED_OUTPUT", result.content) };
        }
        return { ok: true, content: normalizeContent(result.content), metadata: result._meta };
      } catch (error) {
        return { ok: false, error: createSafeMcpError("CONNECTION_FAILED", error) };
      }
    },
    async close() {
      await Promise.all(
        Array.from(sessions.values()).map(async (session) => {
          if (session.client) {
            await session.client.close();
            updateSession(session, { state: "disconnected", tools: [] });
          }
        }),
      );
    },
  };

  function updateSession(
    session: ManagedSession,
    update: Partial<Omit<McpServerSession, "serverName" | "updatedAt">>,
  ): void {
    session.publicSession = { ...session.publicSession, ...update, updatedAt: now() };
  }
}

async function discoverTools(serverName: string, client: McpClientLike): Promise<McpToolDefinition[]> {
  const result = await client.listTools();
  return result.tools.map((tool) => ({
    serverName,
    toolName: tool.name,
    permissionKey: buildMcpToolName(serverName, tool.name),
    description: tool.description ?? "",
    inputSchema: tool.inputSchema,
    isAvailable: true,
  }));
}

function normalizeContent(content: CallToolResult["content"]): McpCallResult extends { ok: true; content: infer T } ? T : never {
  return content
    .filter((block) => block.type === "text" || block.type === "image" || block.type === "resource")
    .map((block) => {
      if (block.type === "resource") return { type: "resource", resource: block.resource };
      return block;
    }) as McpCallResult extends { ok: true; content: infer T } ? T : never;
}
