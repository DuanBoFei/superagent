import { resolveBrowserProfile } from "../browser/config";
import { PlaywrightBrowserAdapter } from "../browser/playwright-adapter";
import { BrowserSessionManager } from "../browser/session";
import { createMcpManager, type McpManager } from "../mcp/manager";
import { buildModelToolDefinitions } from "../models/tool-schema";
import { createChecker } from "../permissions/checker";
import type { PromptFn } from "../permissions/types";
import { permissionSystem } from "./stubs/permission";
import { createToolDispatcher } from "./tool-dispatcher";
import { browserToolSchema, createBrowserTool } from "../tools/browser";
import { createToolRegistry, clearMcpTools, registerMcpTools, registerTool } from "../tools/registry";
import { registerAllTools } from "../tools/index";
import { defaults } from "../config/defaults";
import type { Config } from "../config/types";
import { createQueryLoop, QueryLoopDeps } from "./query-loop";
import { SessionState, State, TurnEvent, TurnSummary } from "./types";
import { composePrompt } from "./stubs/context";
import { sendMessage } from "./stubs/model";
import { checkPermission } from "./stubs/permission";
import { saveSession, loadSession } from "./stubs/session";
import type { LogEvent } from "../observability/types";
import { redactMcpSecrets } from "../mcp/errors";
import { createHookManager } from "../hooks";
import { createSessionStartEvent, createStopEvent } from "../hooks/events";
import { collectFiles } from "../repo-map/collector";
import { buildRepoMap } from "../repo-map/builder";
import { renderRepoMap } from "../repo-map/render";
import { createIgnoreOptions } from "../repo-map/ignore";
import { discoverSkills } from "../skills/discovery";
import { validateArgs } from "../skills/invocation";
import { renderSkillContext } from "../skills/prompt";
import { getSkill } from "../skills/registry";
import { hasPlanModeSuggestion } from "../skills/routing";
import type { SkillRegistry, SkillDiagnostic } from "../skills/types";

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
  skillRegistry?: SkillRegistry;
  skillDiagnostics?: SkillDiagnostic[];
}

export interface RuntimeHandle {
  getSession(): SessionState;
  startTurn(userMessage: string): AsyncGenerator<TurnEvent>;
  resumeSession(sessionId: string): AsyncGenerator<TurnEvent>;
  setActiveSkill(name: string, args: Record<string, string>): SkillDiagnostic[];
  clearActiveSkill(): void;
  hasActiveSkillPlanSuggestion(): boolean;
  getSkillRegistry(): SkillRegistry | undefined;
}

export function createRuntime(options: RuntimeOptions = {}): RuntimeHandle {
  const config = options.config ?? defaults;
  const mcpManager = options.mcpManager ?? createMcpManager(config.mcpServers);
  const registry = createToolRegistry();
  registerAllTools(registry);
  const browserProfile = resolveBrowserProfile({ config: config.browser ?? defaults.browser, workspace: process.cwd() });
  if (browserProfile !== undefined) {
    registerTool(
      registry,
      "Browser",
      createBrowserTool({ profile: browserProfile, sessions: new BrowserSessionManager(new PlaywrightBrowserAdapter()), emit: options.emit }),
      browserToolSchema,
      false,
    );
  }
  registerMcpTools(registry, mcpManager, { emit: options.emit });

  const promptPermission: PromptFn = options.promptPermission ?? (async () => "denied");
  const permission = options.config ? createChecker(config.permissions, promptPermission) : permissionSystem;
  const hookManager = options.hookManager ?? createHookManager(config, { emit: options.emit });
  const dispatcher = createToolDispatcher({ registry, permission, hookManager });

  const { config: _config, mcpManager: _mcpManager, promptPermission: _promptPermission, ...queryDeps } = options;
  const resolvedDeps = {
    ...defaultDeps(),
    ...queryDeps,
    maxTurns: queryDeps.maxTurns ?? config.maxTurns,
    model: queryDeps.model ?? config.model,
    dispatchTools: dispatcher.dispatchTools,
    hookManager,
  };
  let session: SessionState = createFreshSession({
    skillDiscoveryDiagnostics: options.skillDiagnostics?.length ?? 0,
    skillDiscoveryErrorCount: options.skillDiagnostics?.filter((d) => d.reason !== "duplicate-name").length ?? 0,
  });
  let mcpConnected = false;
  let repoMapText: string | undefined;
  const skillRegistry: SkillRegistry | undefined = options.skillRegistry;

  async function ensureMcpConnected(): Promise<void> {
    if (mcpConnected) return;
    const connectStarts = new Map<string, number>();
    for (const mcpSession of mcpManager.getSessions()) {
      if (mcpSession.state !== "disabled") {
        connectStarts.set(mcpSession.serverName, Date.now());
        options.emit?.({ type: "mcp:server_connect_start", serverName: mcpSession.serverName });
      }
    }

    await mcpManager.connectAll();

    for (const mcpSession of mcpManager.getSessions()) {
      const startedAt = connectStarts.get(mcpSession.serverName);
      if (startedAt !== undefined) {
        options.emit?.({
          type: "mcp:server_connect_end",
          serverName: mcpSession.serverName,
          success: mcpSession.state === "connected",
          durationMs: Date.now() - startedAt,
          ...(mcpSession.lastError?.detail || mcpSession.lastError?.message
            ? { error: redactMcpSecrets(mcpSession.lastError.detail ?? mcpSession.lastError.message) }
            : {}),
        });
      }
    }

    registerMcpTools(registry, mcpManager, { emit: options.emit });
    mcpConnected = true;
  }

  async function dispatchSessionStart(resumed: boolean): Promise<void> {
    await hookManager.dispatch(
      "SessionStart",
      createSessionStartEvent({
        sessionId: session.sessionId,
        timestamp: new Date().toISOString(),
        cwd: process.cwd(),
        resumed,
      }),
    );
  }

  async function dispatchStop(reason?: TurnSummary["reason"]): Promise<void> {
    await hookManager.dispatch(
      "Stop",
      createStopEvent({
        sessionId: session.sessionId,
        timestamp: new Date().toISOString(),
        cwd: process.cwd(),
        reason,
      }),
    );
  }

  async function refreshMcpTools(): Promise<void> {
    for (const mcpSession of mcpManager.getSessions()) {
      if (mcpSession.state !== "disabled") {
        const startedAt = Date.now();
        let thrownError: unknown;
        try {
          await mcpManager.refreshTools(mcpSession.serverName);
        } catch (error) {
          thrownError = error;
        }

        const refreshed = mcpManager.getSession(mcpSession.serverName);
        const error = thrownError instanceof Error
          ? thrownError.message
          : refreshed?.lastError?.detail ?? refreshed?.lastError?.message;
        options.emit?.({
          type: "mcp:tools_refresh",
          serverName: mcpSession.serverName,
          success: refreshed?.state === "connected" && thrownError === undefined,
          durationMs: Date.now() - startedAt,
          toolCount: refreshed?.tools.length ?? 0,
          ...(error ? { error: redactMcpSecrets(error) } : {}),
        });
      }
    }

    clearMcpTools(registry);
    registerMcpTools(registry, mcpManager, { emit: options.emit });
  }

  return {
    getSession() {
      return session;
    },

    setActiveSkill(name: string, args: Record<string, string>): SkillDiagnostic[] {
      if (!skillRegistry) return [];
      const result = getSkill(skillRegistry, name);
      if (result.error) {
        return [result.error];
      }
      const skill = result.skill!;
      const argDiags = validateArgs(skill.manifest, args);
      if (argDiags.length > 0) {
        return argDiags;
      }
      session.activeSkill = { name, args };
      options.emit?.({ type: "skill:invoked", skillName: name, args });
      return [];
    },

    clearActiveSkill(): void {
      session.activeSkill = undefined;
    },

    hasActiveSkillPlanSuggestion(): boolean {
      if (!skillRegistry || !session.activeSkill) return false;
      const result = getSkill(skillRegistry, session.activeSkill.name);
      if (result.error || !result.skill) return false;
      return hasPlanModeSuggestion(result.skill);
    },

    getSkillRegistry(): SkillRegistry | undefined {
      return skillRegistry;
    },

    async *startTurn(userMessage: string) {
      await ensureMcpConnected();
      await refreshMcpTools();
      session.messages.push({ role: "user", content: userMessage });

      const sigintHandler = () => {
        session.interruptFlag = true;
      };
      process.once("SIGINT", sigintHandler);

      let stopReason: TurnSummary["reason"] | undefined;
      try {
        if (config.repoMap.enabled && repoMapText === undefined) {
          const startedAt = Date.now();
          const snapshot = buildRepoMapSnapshot(process.cwd(), config);
          repoMapText = snapshot.text;
          session.repoMapFileCount = snapshot.fileCount;
          session.repoMapDiagnosticCount = snapshot.diagnosticCount;
          options.emit?.({
            type: "repomap:build_end",
            durationMs: Date.now() - startedAt,
            fileCount: snapshot.fileCount,
            diagnosticCount: snapshot.diagnosticCount,
          });
        }
        await dispatchSessionStart(false);
        for await (const event of createQueryLoop(session, withModelTools())) {
          if (event.type === "turn_end") {
            stopReason = event.summary.reason;
          }
          yield event;
        }
      } finally {
        process.off("SIGINT", sigintHandler);
        await dispatchStop(stopReason);
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

      let stopReason: TurnSummary["reason"] | undefined;
      try {
        if (config.repoMap.enabled && repoMapText === undefined) {
          const startedAt = Date.now();
          const snapshot = buildRepoMapSnapshot(process.cwd(), config);
          repoMapText = snapshot.text;
          session.repoMapFileCount = snapshot.fileCount;
          session.repoMapDiagnosticCount = snapshot.diagnosticCount;
          options.emit?.({
            type: "repomap:build_end",
            durationMs: Date.now() - startedAt,
            fileCount: snapshot.fileCount,
            diagnosticCount: snapshot.diagnosticCount,
          });
        }
        await dispatchSessionStart(true);
        for await (const event of createQueryLoop(session, withModelTools())) {
          if (event.type === "turn_end") {
            stopReason = event.summary.reason;
          }
          yield event;
        }
      } finally {
        await dispatchStop(stopReason);
      }
    },
  };

  function withModelTools(): QueryLoopDeps {
    return {
      ...resolvedDeps,
      composePrompt(messages) {
        let skillContext: string | undefined;
        if (skillRegistry && session.activeSkill) {
          const result = getSkill(skillRegistry, session.activeSkill.name);
          if (result.skill) {
            skillContext = renderSkillContext(result.skill, session.activeSkill.args);
          }
        }
        const prompt = resolvedDeps.composePrompt(messages, { repoMapText, skillContext });
        return {
          ...prompt,
          tools: buildModelToolDefinitions(registry),
        };
      },
    };
  }
}

interface RepoMapSnapshot {
  text: string;
  fileCount: number;
  diagnosticCount: number;
}

function buildRepoMapSnapshot(rootPath: string, config: Config): RepoMapSnapshot {
  const collected = collectFiles(rootPath, {
    ignore: createIgnoreOptions(),
    maxFiles: config.repoMap.maxFiles,
    maxFileBytes: config.repoMap.maxFileBytes,
  });
  const repoMap = buildRepoMap(rootPath, collected.files, collected.diagnostics);
  return {
    text: renderRepoMap(repoMap, { maxChars: config.repoMap.promptBudget }),
    fileCount: repoMap.files.length,
    diagnosticCount: repoMap.diagnostics.length,
  };
}
