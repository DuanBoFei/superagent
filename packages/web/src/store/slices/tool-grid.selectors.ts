import type {
  ToolCardData,
  StatusFilter,
  SortField,
  SortOrder,
  ResourceMetrics,
} from "../../types/tool-grid";

// ── Status priority map ──────────────────────────────

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  running: 1,
  success: 2,
  failed: 3,
  cancelled: 4,
};

// ── selectFilteredTools ──────────────────────────────

export function selectFilteredTools(
  tools: ToolCardData[],
  filter: StatusFilter,
): ToolCardData[] {
  if (filter === "all") return [...tools];
  if (filter === "completed") {
    return tools.filter(
      (t) =>
        t.status === "success" || t.status === "failed" || t.status === "cancelled",
    );
  }
  return tools.filter((t) => t.status === filter);
}

// ── selectSortedTools ────────────────────────────────

function stableCompare(a: ToolCardData, b: ToolCardData): number {
  return a.toolId.localeCompare(b.toolId);
}

function getDurationMs(t: ToolCardData): number {
  return t.durationMs ?? -1;
}

export function selectSortedTools(
  tools: ToolCardData[],
  sortBy: SortField,
  sortOrder: SortOrder,
): ToolCardData[] {
  const sorted = [...tools];
  const order = sortOrder === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    let cmp = 0;

    switch (sortBy) {
      case "status":
        cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
        break;

      case "duration": {
        const aDur = getDurationMs(a);
        const bDur = getDurationMs(b);
        if (aDur < 0 && bDur < 0) return stableCompare(a, b);
        if (aDur < 0) return 1;
        if (bDur < 0) return -1;
        cmp = aDur - bDur;
        break;
      }

      case "name":
        cmp = a.toolName.localeCompare(b.toolName);
        break;
    }

    return cmp * order || stableCompare(a, b) * order;
  });

  return sorted;
}

// ── selectFailedTools ────────────────────────────────

export function selectFailedTools(tools: ToolCardData[]): ToolCardData[] {
  return tools.filter((t) => t.status === "failed");
}

// ── selectResourceMetrics ────────────────────────────

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

export function selectResourceMetrics(tools: ToolCardData[]): ResourceMetrics[] {
  const completed = tools.filter(
    (t) =>
      t.status === "success" || t.status === "failed" || t.status === "cancelled",
  );
  if (completed.length === 0) return [];

  // Collect valid durations
  const durations = completed
    .map((t) => t.durationMs)
    .filter((d): d is number => d !== null && d !== undefined && d > 0);

  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const maxOutput = Math.max(...completed.map((t) => t.resourceUsage.outputBytes));

  const metrics: ResourceMetrics[] = [];

  for (const tool of completed) {
    if (tool.durationMs !== null && tool.durationMs !== undefined && tool.durationMs > 0) {
      metrics.push({
        toolId: tool.toolId,
        toolName: tool.toolName,
        metricName: "duration",
        value: tool.durationMs,
        normalizedValue: maxDuration > 0 ? tool.durationMs / maxDuration : 1.0,
        label: formatDuration(tool.durationMs),
      });
    }

    metrics.push({
      toolId: tool.toolId,
      toolName: tool.toolName,
      metricName: "outputSize",
      value: tool.resourceUsage.outputBytes,
      normalizedValue: maxOutput > 0 ? tool.resourceUsage.outputBytes / maxOutput : 1.0,
      label: formatBytes(tool.resourceUsage.outputBytes),
    });
  }

  return metrics;
}

// ── selectGridStats ──────────────────────────────────

export interface GridStats {
  pending: number;
  running: number;
  success: number;
  failed: number;
  cancelled: number;
  total: number;
}

export function selectGridStats(tools: ToolCardData[]): GridStats {
  let pending = 0;
  let running = 0;
  let success = 0;
  let failed = 0;
  let cancelled = 0;

  for (const t of tools) {
    switch (t.status) {
      case "pending":
        pending++;
        break;
      case "running":
        running++;
        break;
      case "success":
        success++;
        break;
      case "failed":
        failed++;
        break;
      case "cancelled":
        cancelled++;
        break;
    }
  }

  return {
    pending,
    running,
    success,
    failed,
    cancelled,
    total: pending + running + success + failed + cancelled,
  };
}
