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
  let repoMapFileCount: number | undefined;
  let repoMapDiagnosticCount: number | undefined;

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
      case "repomap:build_end":
        repoMapFileCount = event.fileCount;
        repoMapDiagnosticCount = event.diagnosticCount;
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
      repoMapFileCount,
      repoMapDiagnosticCount,
    };
  }

  return { record, getSessionStats };
}
