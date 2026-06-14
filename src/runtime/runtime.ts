import { createMcpManager, type McpManager } from "../mcp/manager";
import { createChecker } from "../permissions/checker";
import type { PromptFn } from "../permissions/types";
import { permissionSystem } from "./stubs/permission";
import { createToolDispatcher } from "./tool-dispatcher";
import { createToolRegistry, clearMcpTools, registerMcpTools } from "../tools/registry";
import { registerAllTools } from "../tools/index";
import { defaults } from "../config/defaults";
import type { Config } from "../config/types";
import { createQueryLoop, QueryLoopDeps } from "./query-loop";
import { SessionState, State, TurnEvent } from "./types";
import { composePrompt } from "./stubs/context";
import { sendMessage } from "./stubs/model";
import { checkPermission } from "./stubs/permission";
import { saveSession, loadSession } from "./stubs/session";
import type { LogEvent } from "../observability/types";

function defaultDeps(): QueryLoopDeps {
  return {
    maxTurns: 50,
    model: "deepseek-v4-pro",
    composePrompt,
    sendMessage,
    checkPermission,
    saveSession,
    loadSession,
  };
}

function createFreshSession(overrides?: Partial<SessionState>): SessionState {
  return {
    sessionId: crypto.randomUUID(),
    turnNumber: 0,
    messages: [],
    toolResults: [],
    state: State.IDLE,
    interruptFlag: false,
    startedAt: Date.now(),
    ...overrides,
  };
}

export interface RuntimeOptions extends Partial<QueryLoopDeps> {
  config?: Config;
  mcpManager?: McpManager;
  promptPermission?: PromptFn;
}

export interface RuntimeHandle {
  getSession(): SessionState;
  startTurn(userMessage: string): AsyncGenerator<TurnEvent>;
  resumeSession(sessionId: string): AsyncGenerator<TurnEvent>;
}

export function createRuntime(options: RuntimeOptions = {}): RuntimeHandle {
  const config = options.config ?? defaults;
  const mcpManager = options.mcpManager ?? createMcpManager(config.mcpServers);
  const registry = createToolRegistry();
  registerAllTools(registry);
  registerMcpTools(registry, mcpManager);

  const promptPermission: PromptFn = options.promptPermission ?? (async () => "denied");
  const permission = options.config ? createChecker(config.permissions, promptPermission) : permissionSystem;
  const dispatcher = createToolDispatcher({ registry, permission });

  const { config: _config, mcpManager: _mcpManager, promptPermission: _promptPermission, ...queryDeps } = options;
  const resolvedDeps = {
    ...defaultDeps(),
    ...queryDeps,
    maxTurns: queryDeps.maxTurns ?? config.maxTurns,
    model: queryDeps.model ?? config.model,
    dispatchTools: dispatcher.dispatchTools,
  };
  let session: SessionState = createFreshSession();
  let mcpConnected = false;

  async function ensureMcpConnected(): Promise<void> {
    if (mcpConnected) return;
    await mcpManager.connectAll();
    registerMcpTools(registry, mcpManager);
    mcpConnected = true;
  }

  async function refreshMcpTools(): Promise<void> {
    for (const mcpSession of mcpManager.getSessions()) {
      if (mcpSession.state !== "disabled") {
        try {
          await mcpManager.refreshTools(mcpSession.serverName);
        } catch {
          // Keep built-in tools available when one MCP server refresh fails.
        }
      }
    }

    clearMcpTools(registry);
    registerMcpTools(registry, mcpManager);
  }

  return {
    getSession() {
      return session;
    },

    async *startTurn(userMessage: string) {
      await ensureMcpConnected();
      await refreshMcpTools();
      session.messages.push({ role: "user", content: userMessage });

      const sigintHandler = () => {
        session.interruptFlag = true;
      };
      process.once("SIGINT", sigintHandler);

      try {
        yield* createQueryLoop(session, resolvedDeps);
      } finally {
        process.off("SIGINT", sigintHandler);
      }
    },

    async *resumeSession(sessionId: string) {
      await ensureMcpConnected();
      await refreshMcpTools();
      const loaded = resolvedDeps.loadSession?.(sessionId);
      if (loaded) {
        session = loaded;
        session.interruptFlag = false;
        session.messages.push({
          role: "system",
          content: "Continue where you left off.",
        });
      } else {
        session = createFreshSession({
          sessionId,
          messages: [
            { role: "system", content: "Continue where you left off." },
          ],
        });
      }

      yield* createQueryLoop(session, resolvedDeps);
    },
  };
}
