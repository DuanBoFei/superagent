import { spawn, type ChildProcess } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { WebServer, type StartResult } from "../server/index";
import { WebLogger } from "../server/logger";
import { openBrowser, type BrowserOpenResult } from "../utils/browser";
import type { SocketHub } from "../server/socket-hub";
import type { MessageRuntime, SessionDataProvider } from "../server/socket-handlers";
import { getConfig } from "../config/config";
import { createRuntime } from "../runtime/runtime";
import { RuntimeBridge } from "../server/runtime-bridge";
import { createSessionManager } from "../persistence/session-manager";

export interface WebCommandOptions {
  port?: number;
  verbose?: boolean;
  noOpen?: boolean;
  staticRoot?: string;
  waitForSignal?: boolean;
  createServer?: (options: { port: number; staticRoot?: string }) => WebCommandServer;
  logger?: WebLogger;
  open?: (url: string) => Promise<BrowserOpenResult>;
  noFrontend?: boolean;
  frontendPort?: number;
  spawnFrontend?: (backendPort: number, frontendPort: number) => ChildProcess;
  createRuntimeBridge?: () => MessageRuntime;
  createSessionProvider?: () => SessionDataProvider;
}

export interface WebCommandServer {
  start(): Promise<StartResult>;
  shutdown(timeoutMs?: number): Promise<void>;
  getIO?(): SocketHub;
}

function defaultCreateRuntimeBridge(): MessageRuntime {
  const configResult = getConfig();
  const bridge = new RuntimeBridge(() => createRuntime({ config: configResult.config }));
  return {
    startTurn(message) {
      return bridge.routeToRuntime(message);
    },
  };
}

function defaultCreateSessionProvider(): SessionDataProvider {
  const dbPath = path.join(homedir(), ".superagent", "sessions.db");
  const manager = createSessionManager(dbPath);
  return {
    listSessions(limit?: number) {
      return manager.list().slice(0, limit ?? 50).map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        turnCount: s.turns,
        firstMessage: s.firstMessage,
      }));
    },
    loadSessionMessages(id: string) {
      const state = manager.load(id);
      if (!state) return null;
      return state.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    },
  };
}

export async function startWebCommand(options: WebCommandOptions = {}): Promise<number> {
  const logger = options.logger ?? new WebLogger({ verbose: options.verbose });
  const server = options.createServer?.({
    port: options.port ?? 3456,
    staticRoot: options.staticRoot,
  }) ?? new WebServer({ port: options.port ?? 3456, staticRoot: options.staticRoot });

  let frontend: ChildProcess | null = null;

  try {
    const result = await server.start();
    logger.info(`Backend server started at ${result.url}`);

    const io = server.getIO?.();
    if (io) {
      const runtimeBridge = options.createRuntimeBridge?.() ?? defaultCreateRuntimeBridge();
      const sessionProvider = options.createSessionProvider?.() ?? defaultCreateSessionProvider();
      io.registerHandlers(runtimeBridge, sessionProvider);
    }

    if (!options.noFrontend) {
      const frontendPort = options.frontendPort ?? 3000;
      frontend = (options.spawnFrontend ?? defaultSpawnFrontend)(result.port, frontendPort);
      logger.info(`Frontend dev server starting at http://localhost:${frontendPort}`);
    }

    const shutdownPromise = registerShutdown(server, frontend, logger);

    const browserUrl = options.noFrontend
      ? result.url
      : `http://localhost:${options.frontendPort ?? 3000}`;

    if (options.noOpen) {
      logger.info(`Open ${browserUrl} in your browser`);
    } else {
      const browser = await (options.open ?? openBrowser)(browserUrl);
      if (!browser.opened) {
        logger.warn(
          `Browser did not open automatically. Open ${browserUrl} manually.`,
        );
      }
      if (browser.error) {
        logger.debug(`Browser open failed: ${browser.error}`);
      }
    }

    if (options.waitForSignal ?? false) {
      await shutdownPromise;
    }

    return 0;
  } catch (error) {
    logger.error(
      `Failed to start web server: ${error instanceof Error ? error.message : String(error)}`,
    );
    if (frontend) {
      frontend.kill();
    }
    server.shutdown(1000).catch(() => {});
    return 1;
  }
}

function defaultSpawnFrontend(backendPort: number, frontendPort: number): ChildProcess {
  const webDir = path.resolve(process.cwd(), "packages", "web");
  const child = spawn("npx", ["next", "dev", "-p", String(frontendPort)], {
    cwd: webDir,
    env: {
      ...process.env,
      NEXT_PUBLIC_BACKEND_PORT: String(backendPort),
    },
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("error", () => {
    // Frontend spawn failure is non-fatal — backend is still running
  });

  return child;
}

function registerShutdown(
  server: WebCommandServer,
  frontend: ChildProcess | null,
  logger: WebLogger,
): Promise<void> {
  let shuttingDown = false;

  return new Promise<void>((resolve) => {
    const shutdown = () => {
      if (shuttingDown) return;
      shuttingDown = true;

      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);

      if (frontend) {
        frontend.kill();
      }

      const forceExit = setTimeout(() => {
        logger.warn("Graceful shutdown timed out, forcing exit");
        resolve();
      }, 5000);

      server.shutdown(1000).finally(() => {
        clearTimeout(forceExit);
        logger.info("Web server stopped");
        resolve();
      });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}
