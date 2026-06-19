import { WebServer, type StartResult } from "../server/index";
import { WebLogger } from "../server/logger";
import { openBrowser, type BrowserOpenResult } from "../utils/browser";

export interface WebCommandOptions {
  port?: number;
  verbose?: boolean;
  noOpen?: boolean;
  staticRoot?: string;
  waitForSignal?: boolean;
  createServer?: (options: { port: number; staticRoot?: string }) => WebCommandServer;
  logger?: WebLogger;
  open?: (url: string) => Promise<BrowserOpenResult>;
}

export interface WebCommandServer {
  start(): Promise<StartResult>;
  shutdown(timeoutMs?: number): Promise<void>;
}

export async function startWebCommand(options: WebCommandOptions = {}): Promise<number> {
  const logger = options.logger ?? new WebLogger({ verbose: options.verbose });
  const server = options.createServer?.({ port: options.port ?? 3456, staticRoot: options.staticRoot }) ??
    new WebServer({ port: options.port ?? 3456, staticRoot: options.staticRoot });

  try {
    const result = await server.start();
    logger.info(`Web server started at ${result.url}`);
    logger.info(`PID ${result.pid}`);

    if (options.noOpen) {
      logger.info(`Open ${result.url} in your browser`);
    } else {
      const browser = await (options.open ?? openBrowser)(result.url);
      if (!browser.opened) {
        logger.warn(`Browser did not open automatically. Open ${result.url} manually.`);
      }
      if (browser.error) {
        logger.debug(`Browser open failed: ${browser.error}`);
      }
    }

    if (options.waitForSignal ?? false) {
      await waitForShutdown(server, logger);
    }

    return 0;
  } catch (error) {
    logger.error(`Failed to start web server: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

async function waitForShutdown(server: WebCommandServer, logger: WebLogger): Promise<void> {
  await new Promise<void>((resolve) => {
    const shutdown = () => {
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
      server.shutdown(1000).finally(() => {
        logger.info("Web server stopped");
        resolve();
      });
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}
