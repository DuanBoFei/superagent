// ── Tool Status ──────────────────────────────────────────

export type ToolStatus = "pending" | "running" | "success" | "failed" | "cancelled";

// ── Tool Card Data ──────────────────────────────────────

export interface ResourceUsage {
  outputBytes: number;
  memoryBytes?: number;
}

export interface ToolError {
  message: string;
  stack?: string;
}

export interface ToolCardData {
  toolId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  status: ToolStatus;
  progress: number | null;
  startTime: number;
  endTime: number | null;
  durationMs: number | null;
  outputPreview: string[];
  fullOutput: string;
  error: ToolError | null;
  isExpanded: boolean;
  resourceUsage: ResourceUsage;
  cancelledAt?: number;
}

// ── Tool Grid State ─────────────────────────────────────

export type SortField = "status" | "duration" | "name";
export type SortOrder = "asc" | "desc";
export type ViewMode = "grid" | "list";
export type StatusFilter = "all" | "running" | "failed" | "completed";

export interface ToolGridState {
  toolIds: string[];
  tools: ToolCardData[];
  filters: {
    status: StatusFilter;
  };
  sortBy: SortField;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  errorExpanded: boolean;
}

// ── Resource Metrics ────────────────────────────────────

export type MetricName = "duration" | "outputSize" | "memory";

export interface ResourceMetrics {
  toolId: string;
  toolName: string;
  metricName: MetricName;
  value: number;
  normalizedValue: number;
  label: string;
}

// ── Bulk Action ─────────────────────────────────────────

export type BulkActionType = "cancelAll" | "expandAll" | "collapseAll" | "clearCompleted";

export interface BulkAction {
  actionType: BulkActionType;
  affectedCount: number;
  timestamp: number;
}

// ── Grid Column Count ───────────────────────────────────

export type GridColumns = 1 | 2 | 3;

export function calculateColumns(toolCount: number, viewMode: ViewMode, containerWidth: number): GridColumns {
  if (viewMode === "list" || containerWidth < 600) {
    return 1;
  }
  if (toolCount <= 2) {
    return 1;
  }
  if (toolCount <= 4) {
    return 2;
  }
  return 3;
}
