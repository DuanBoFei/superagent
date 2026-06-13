import { SessionStats, LogEvent } from "./types";

export interface StatsCollector {
  record(event: LogEvent): void;
  getSessionStats(): SessionStats;
}

export function createStatsCollector(): StatsCollector {
  let turns = 0;
  const filesChanged: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;

  function record(event: LogEvent): void {
    switch (event.type) {
      case "turn:end":
        turns++;
        totalInputTokens += event.inputTokens;
        totalOutputTokens += event.outputTokens;
        break;
      case "model:response":
        totalCost += event.cost;
        break;
      case "tool:end":
        if (event.toolName === "Write" || event.toolName === "Edit") {
          if (!filesChanged.includes(event.toolName)) {
            filesChanged.push(event.toolName);
          }
        }
        break;
    }
  }

  function getSessionStats(): SessionStats {
    return {
      turns,
      filesChanged,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
    };
  }

  return { record, getSessionStats };
}
