import { Config } from "../config/types";
import { LogEvent, SessionStats, DEFAULT_COST_MODEL } from "./types";
import { createLogger } from "./logger";
import { createCostTracker } from "./cost-tracker";
import { createStatsCollector } from "./stats-collector";
import { createVerbosePrinter } from "./verbose";

export { redactSecrets } from "./verbose";
export type { LogEvent, SessionStats, CostModel, CostResult } from "./types";

const DEFAULT_LOG_DIR = (() => {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "/tmp";
  return `${home}/.superagent/logs`;
})();

export interface Observability {
  emit(event: LogEvent): void;
  getSessionStats(): SessionStats;
  getSessionLogPath(): string;
  close(): void;
}

export function createObservability(
  config: Config,
  sessionId: string,
  opts?: { logDir?: string; verbose?: boolean },
): Observability {
  const logDir = opts?.logDir ?? DEFAULT_LOG_DIR;
  const verbose = opts?.verbose ?? false;

  const logger = createLogger(sessionId, logDir);
  const costTracker = createCostTracker(DEFAULT_COST_MODEL);
  const statsCollector = createStatsCollector();
  const verbosePrinter = createVerbosePrinter({
    enabled: verbose,
    write: (data: string) => process.stderr.write(data),
  });

  function emit(event: LogEvent): void {
    let enriched = event;

    if (event.type === "model:response") {
      const result = costTracker.trackUsage(
        event.model,
        event.inputTokens,
        event.outputTokens,
      );
      if (!result.unknownModel) {
        enriched = { ...event, cost: result.totalCost };
      }
    }

    logger.log(enriched);
    statsCollector.record(enriched);
    verbosePrinter.print(enriched);
  }

  function getSessionStats(): SessionStats {
    const stats = statsCollector.getSessionStats();
    return { ...stats, totalCost: costTracker.getSessionCost() };
  }

  function getSessionLogPath(): string {
    return logger.getPath();
  }

  function close(): void {
    logger.close();
  }

  return { emit, getSessionStats, getSessionLogPath, close };
}
