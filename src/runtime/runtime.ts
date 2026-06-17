import { runMultiAgentOrchestration, type PhaseRunner } from "../agents/orchestrator";
import { createRolePermissionSystem } from "../agents/role-permissions";
import { getRolePrompt } from "../agents/role-prompts";
import { routeMultiAgentPrompt } from "../agents/router";
import type { AgentRole, PhaseInput, PhaseResult, ReviewFinding } from "../agents/types";
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
  let session: SessionState = createFreshSession();
  let mcpConnected = false;

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

    async *startTurn(userMessage: string) {
      await ensureMcpConnected();
      await refreshMcpTools();
      const routing = routeMultiAgentPrompt(userMessage);
      session.messages.push({ role: "user", content: routing.prompt });

      const sigintHandler = () => {
        session.interruptFlag = true;
      };
      process.once("SIGINT", sigintHandler);

      let stopReason: TurnSummary["reason"] | undefined;
      try {
        await dispatchSessionStart(false);
        if (routing.mode === "multi") {
          const run = await runMultiAgentOrchestration(routing.prompt, {
            runPhase: ((input) => runRolePhase(input.role, formatPhasePrompt(input))) satisfies PhaseRunner,
            emit(event) {
              options.emit?.(event);
            },
          });

          for (const phase of run.phases) {
            yield { type: "agent_phase", role: phase.role, lifecycle: "result" };
            yield { type: "text", content: `[${phase.role}] ${phase.summary}\n` };
          }

          session.messages.push({
            role: "assistant",
            content: `Multi-agent run ${run.status}: ${run.phases.map((phase) => `${phase.role}: ${phase.summary}`).join(" | ")}`,
          });
          session.turnNumber++;
          stopReason = run.status === "interrupted" ? "interrupted" : run.status === "failed" || run.status === "blocked" ? "error" : "completed";
          yield {
            type: "turn_end",
            summary: {
              turnNumber: session.turnNumber,
              totalTokens: 0,
              totalCost: 0,
              reason: stopReason,
            },
          };
          resolvedDeps.saveSession(session);
        } else {
          for await (const event of createQueryLoop(session, withModelTools())) {
            if (event.type === "turn_end") {
              stopReason = event.summary.reason;
            }
            yield event;
          }
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

  function withModelTools(role?: AgentRole): QueryLoopDeps {
    const rolePermission = role ? createRolePermissionSystem(role, permission) : permission;
    const roleDispatcher = role
      ? createToolDispatcher({ registry, permission: rolePermission, hookManager })
      : dispatcher;

    return {
      ...resolvedDeps,
      checkPermission(toolName, args) {
        if (role === "review" && toolName === "ReviewFinding") {
          return { allowed: true };
        }
        return resolvedDeps.checkPermission(toolName, args);
      },
      async dispatchTools(calls) {
        const externalCalls = calls.filter((call) => !(role === "review" && call.name === "ReviewFinding"));
        const results = externalCalls.length > 0 ? await roleDispatcher.dispatchTools(externalCalls) : [];
        return [
          ...calls.filter((call) => role === "review" && call.name === "ReviewFinding").map((call) => ({
            name: call.name,
            success: true,
            output: JSON.stringify(call.args),
          })),
          ...results,
        ];
      },
      composePrompt(messages) {
        const prompt = resolvedDeps.composePrompt(messages);
        return {
          ...prompt,
          system: role ? `${getRolePrompt(role)}\n\n${prompt.system}` : prompt.system,
          tools: buildModelToolDefinitions(registry),
        };
      },
    };
  }

  function formatPhasePrompt(input: PhaseInput): string {
    const context = [
      input.findings?.length ? `Explore findings:\n${input.findings.join("\n")}` : undefined,
      input.changedFiles?.length ? `Changed files:\n${input.changedFiles.join("\n")}` : undefined,
      input.tests?.length ? `Verification:\n${input.tests.join("\n")}` : undefined,
    ].filter(Boolean).join("\n\n");

    return context ? `${input.prompt}\n\n${context}` : input.prompt;
  }

  function parseReviewFinding(args: Record<string, unknown>): ReviewFinding {
    return {
      category: isReviewFindingCategory(args.category) ? args.category : "correctness",
      description: typeof args.description === "string" ? args.description : "Review finding",
      priority: args.priority === "low" || args.priority === "medium" ? args.priority : "high",
      file: typeof args.file === "string" ? args.file : undefined,
      line: typeof args.line === "number" ? args.line : undefined,
      blocking: args.blocking === true,
    };
  }

  function isReviewFindingCategory(value: unknown): value is ReviewFinding["category"] {
    return value === "correctness" || value === "security" || value === "test" || value === "permission" || value === "maintainability";
  }

  async function runRolePhase(role: AgentRole, prompt: string): Promise<PhaseResult> {
    const phaseSession = createFreshSession({
      sessionId: `${session.sessionId}:${role}`,
      messages: [{ role: "user", content: prompt }],
    });
    const text: string[] = [];
    const changedFiles = new Set<string>();
    const tests = new Set<string>();
    const defects: ReviewFinding[] = [];

    for await (const event of createQueryLoop(phaseSession, { ...withModelTools(role), saveSession: () => {} })) {
      if (event.type === "text") {
        text.push(event.content);
      } else if (event.type === "tool_call") {
        if (role === "review" && event.name === "ReviewFinding") {
          const defect = parseReviewFinding(event.args);
          defects.push(defect);
          if (defect.blocking) {
            return {
              role,
              status: "completed",
              summary: text.join("") || "Review blocked by defects",
              defects,
            };
          }
          continue;
        }
        if ((event.name === "Write" || event.name === "Edit") && typeof event.args.file_path === "string") {
          changedFiles.add(event.args.file_path);
        }
        if (event.name === "Bash" && typeof event.args.command === "string") {
          tests.add(event.args.command);
        }
      } else if (event.type === "error") {
        return {
          role,
          status: "failed",
          summary: text.join("") || "Phase failed",
          error: event.message,
        };
      }
    }

    return {
      role,
      status: phaseSession.interruptFlag ? "interrupted" : "completed",
      summary: text.join("") || (defects.some((defect) => defect.blocking) ? "Review blocked by defects" : `${role} completed`),
      findings: role === "explore" ? text.filter(Boolean) : undefined,
      changedFiles: changedFiles.size > 0 ? [...changedFiles] : undefined,
      tests: tests.size > 0 ? [...tests] : undefined,
      defects: defects.length > 0 ? defects : undefined,
    };
  }
}
