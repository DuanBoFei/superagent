import type { ToolCardData, ToolError, ToolStatus, SortField, SortOrder, ViewMode, StatusFilter, ToolGridState, ResourceUsage } from "../../types/tool-grid";

export interface ToolGridSlice {
  // Tool management
  addTool(data: ToolCardData): void;
  getTool(id: string): ToolCardData | undefined;
  getAllTools(): ToolCardData[];
  getToolIds(): string[];

  // Status updates
  updateProgress(id: string, progress: number): void;
  appendOutput(id: string, content: string): void;
  completeTool(id: string): void;
  failTool(id: string, error: ToolError): void;
  cancelTool(id: string): void;

  // Resource usage
  updateResourceUsage(id: string, usage: Partial<ResourceUsage>): void;

  // Grid state
  getGridState(): ToolGridState;
  setSort(field: SortField, order: SortOrder): void;
  setFilter(status: StatusFilter): void;
  setViewMode(mode: ViewMode): void;
  toggleErrorExpanded(): void;
  toggleExpanded(id: string): void;

  // Bulk actions
  expandAll(): void;
  collapseAll(): void;
  clearCompleted(): void;
  cancelAllRunning(): void;

  // Undo
  getUndoStack(): ToolCardData[];
  undoClear(): void;

  // Abort controller management
  registerAbortController(id: string, controller: AbortController): void;
  getAbortController(id: string): AbortController | undefined;

  // Error aggregation
  getFailedTools(): ToolCardData[];

  // Snapshot
  snapshot(): ToolCardData[];
}

const MAX_PREVIEW_LINES = 5;
const CANCEL_GRACE_MS = 3000;

export function createToolGridSlice(): ToolGridSlice {
  const tools = new Map<string, ToolCardData>();
  const abortControllers = new Map<string, AbortController>();
  let undoStack: { tool: ToolCardData; index: number }[] = [];
  let toolIdOrder: string[] = [];
  let sortBy: SortField = "status";
  let sortOrder: SortOrder = "asc";
  let viewMode: ViewMode = "grid";
  let statusFilter: StatusFilter = "all";
  let errorExpanded = false;

  function buildGridState(): ToolGridState {
    const ids = toolIdOrder.filter((id) => tools.has(id));
    const allTools = ids.map((id) => tools.get(id)!);
    return {
      toolIds: ids,
      tools: allTools,
      filters: { status: statusFilter },
      sortBy,
      sortOrder,
      viewMode,
      errorExpanded,
    };
  }

  function recordEndTime(id: string): { endTime: number; durationMs: number } {
    const tool = tools.get(id);
    const endTime = Date.now();
    const durationMs = tool ? endTime - tool.startTime : null;
    return { endTime, durationMs: durationMs ?? 0 };
  }

  function cleanupAbortController(id: string): void {
    abortControllers.delete(id);
  }

  return {
    // ── Tool Management ──────────────────────────────

    addTool(data: ToolCardData): void {
      tools.set(data.toolId, { ...data });
      if (!toolIdOrder.includes(data.toolId)) {
        toolIdOrder.push(data.toolId);
      }
    },

    getTool(id: string): ToolCardData | undefined {
      return tools.get(id);
    },

    getAllTools(): ToolCardData[] {
      return toolIdOrder.filter((id) => tools.has(id)).map((id) => tools.get(id)!);
    },

    getToolIds(): string[] {
      return toolIdOrder.filter((id) => tools.has(id));
    },

    // ── Status Updates ───────────────────────────────

    updateProgress(id: string, progress: number): void {
      const tool = tools.get(id);
      if (!tool) return;
      tools.set(id, { ...tool, progress: Math.max(0, Math.min(100, progress)) });
    },

    appendOutput(id: string, content: string): void {
      const tool = tools.get(id);
      if (!tool) return;
      const fullOutput = tool.fullOutput + content;
      // Collect all output chunks for preview (preserve newlines)
      const previewChunks = [...tool.outputPreview, content];
      // Keep only last MAX_PREVIEW_LINES
      const outputPreview = previewChunks.slice(-MAX_PREVIEW_LINES);
      tools.set(id, {
        ...tool,
        fullOutput,
        outputPreview,
        resourceUsage: {
          ...tool.resourceUsage,
          outputBytes: new TextEncoder().encode(fullOutput).length,
        },
      });
    },

    completeTool(id: string): void {
      const tool = tools.get(id);
      if (!tool) return;
      if (tool.status === "success" || tool.status === "failed" || tool.status === "cancelled") {
        return; // Idempotent
      }
      const { endTime, durationMs } = recordEndTime(id);
      tools.set(id, { ...tool, status: "success", endTime, durationMs, progress: 100 });
      cleanupAbortController(id);
    },

    failTool(id: string, error: ToolError): void {
      const tool = tools.get(id);
      if (!tool) return;
      if (tool.status === "success" || tool.status === "failed" || tool.status === "cancelled") {
        return; // Idempotent
      }
      const { endTime, durationMs } = recordEndTime(id);
      tools.set(id, { ...tool, status: "failed", endTime, durationMs, error });
      cleanupAbortController(id);
    },

    cancelTool(id: string): void {
      const tool = tools.get(id);
      if (!tool) return;
      const { endTime, durationMs } = recordEndTime(id);
      tools.set(id, {
        ...tool,
        status: "cancelled",
        endTime,
        durationMs,
        cancelledAt: Date.now(),
      });
      const ctrl = abortControllers.get(id);
      if (ctrl) {
        ctrl.abort();
        cleanupAbortController(id);
      }
    },

    // ── Resource Usage ───────────────────────────────

    updateResourceUsage(id: string, usage: Partial<ResourceUsage>): void {
      const tool = tools.get(id);
      if (!tool) return;
      tools.set(id, {
        ...tool,
        resourceUsage: { ...tool.resourceUsage, ...usage },
      });
    },

    // ── Grid State ───────────────────────────────────

    getGridState(): ToolGridState {
      return buildGridState();
    },

    setSort(field: SortField, order: SortOrder): void {
      sortBy = field;
      sortOrder = order;
    },

    setFilter(status: StatusFilter): void {
      statusFilter = status;
    },

    setViewMode(mode: ViewMode): void {
      viewMode = mode;
    },

    toggleErrorExpanded(): void {
      errorExpanded = !errorExpanded;
    },

    toggleExpanded(id: string): void {
      const tool = tools.get(id);
      if (!tool) return;
      tools.set(id, { ...tool, isExpanded: !tool.isExpanded });
    },

    // ── Bulk Actions ─────────────────────────────────

    expandAll(): void {
      for (const [id, tool] of tools) {
        tools.set(id, { ...tool, isExpanded: true });
      }
    },

    collapseAll(): void {
      for (const [id, tool] of tools) {
        tools.set(id, { ...tool, isExpanded: false });
      }
    },

    clearCompleted(): void {
      const toRemove: string[] = [];
      undoStack = [];
      const now = Date.now();
      for (const [id, tool] of tools) {
        if (
          tool.status === "success" ||
          tool.status === "failed" ||
          (tool.status === "cancelled" &&
            tool.cancelledAt != null &&
            now - tool.cancelledAt > CANCEL_GRACE_MS)
        ) {
          const index = toolIdOrder.indexOf(id);
          undoStack.push({ tool: { ...tool }, index });
          toRemove.push(id);
        }
      }
      for (const id of toRemove) {
        tools.delete(id);
        abortControllers.delete(id);
      }
      toolIdOrder = toolIdOrder.filter((id) => tools.has(id));
    },

    cancelAllRunning(): void {
      const now = Date.now();
      for (const [id, tool] of tools) {
        if (tool.status === "running" || tool.status === "pending") {
          const { endTime, durationMs } = recordEndTime(id);
          tools.set(id, {
            ...tool,
            status: "cancelled",
            endTime,
            durationMs,
            cancelledAt: now,
          });
          const ctrl = abortControllers.get(id);
          if (ctrl) {
            ctrl.abort();
            abortControllers.delete(id);
          }
        }
      }
    },

    // ── Undo ─────────────────────────────────────────

    getUndoStack(): ToolCardData[] {
      return undoStack.map((entry) => entry.tool);
    },

    undoClear(): void {
      // Sort by original index to restore insertion order
      const sorted = [...undoStack].sort((a, b) => a.index - b.index);
      for (const entry of sorted) {
        tools.set(entry.tool.toolId, { ...entry.tool });
        // Re-insert at original position
        const idx = Math.min(entry.index, toolIdOrder.length);
        toolIdOrder = [...toolIdOrder.slice(0, idx), entry.tool.toolId, ...toolIdOrder.slice(idx)];
      }
      undoStack = [];
    },

    // ── Abort Controllers ────────────────────────────

    registerAbortController(id: string, controller: AbortController): void {
      abortControllers.set(id, controller);
    },

    getAbortController(id: string): AbortController | undefined {
      return abortControllers.get(id);
    },

    // ── Error Aggregation ────────────────────────────

    getFailedTools(): ToolCardData[] {
      return toolIdOrder
        .filter((id) => tools.has(id))
        .map((id) => tools.get(id)!)
        .filter((t) => t.status === "failed");
    },

    // ── Snapshot ─────────────────────────────────────

    snapshot(): ToolCardData[] {
      return toolIdOrder
        .filter((id) => tools.has(id))
        .map((id) => ({ ...tools.get(id)! }));
    },
  };
}
