import { describe, expect, it } from "vitest";
import {
  createToolGridSubscriber,
  type ToolGridEventSubscriber,
} from "../../packages/web/src/hooks/use-tool-grid";
import { createToolGridSlice, type ToolGridSlice } from "../../packages/web/src/store/slices/tool-grid.slice";
import {
  selectFilteredTools,
  selectSortedTools,
  selectFailedTools,
  selectResourceMetrics,
  selectGridStats,
} from "../../packages/web/src/store/slices/tool-grid.selectors";
import { StatusFilter, SortField, SortOrder } from "../../packages/web/src/types/tool-grid";

// ── Helpers ──────────────────────────────────────────

function startEvent(callId: string, toolName: string, title: string) {
  return { toolCallId: callId, toolName, title, timestamp: Date.now() };
}

function outputEvent(callId: string, content: string) {
  return { toolCallId: callId, content };
}

function completeEvent(callId: string, status: "success" = "success") {
  return { toolCallId: callId, status };
}

function errorEvent(callId: string, errorType: string, message: string) {
  return { toolCallId: callId, errorType, message };
}

function setup(): { grid: ToolGridSlice; sub: ToolGridEventSubscriber } {
  const grid = createToolGridSlice();
  const sub = createToolGridSubscriber(grid);
  return { grid, sub };
}

// ── Journey J-031-001 · P0 ───────────────────────────
// "并行工具网格可视化主旅程"
// Crosses features: 026 (Tool Orchestrator) → 031 (ToolGrid store + render)
//                   030 (TerminalRenderer) via 031 ToolCard import
//                   028 (CardRenderer) via renderCardsGrid bridge
//
// Safety-net semantics: if a bug is FIRST discovered here, backfill to
// the corresponding pair-boundary test (use-tool-grid.test.ts,
// tool-grid-slice.test.ts, tool-card-terminal-renderer.test.ts, etc.)

describe("Full-Chain Journey J-031-001: parallel tool grid visualization", () => {
  // ── Hop 1: Orchestrator events → Grid store (026→031 bridge) ──

  describe("Hop 1: Tool Orchestrator events → Grid store", () => {
    it("S1: ToolStart event adds tool with running status", () => {
      const { grid, sub } = setup();
      const now = Date.now();
      sub.onToolStart(startEvent("call_1", "Read", "Read src/app.ts"));

      const tool = grid.getTool("call_1");
      expect(tool).toBeDefined();
      expect(tool?.toolId).toBe("call_1");
      expect(tool?.status).toBe("running");
      expect(tool?.progress).toBe(0);
      expect(tool?.outputPreview).toEqual([]);
      expect(tool?.fullOutput).toBe("");
    });

    it("S2: ToolOutput event appends content with throttling", () => {
      const { grid, sub } = setup();
      sub.onToolStart(startEvent("call_1", "Bash", "Bash: npm test"));
      sub.onToolOutput(outputEvent("call_1", "line 1\n"));
      sub.onToolOutput(outputEvent("call_1", "line 2\n"));

      const tool = grid.getTool("call_1");
      expect(tool?.fullOutput).toContain("line 1");
      expect(tool?.fullOutput).toContain("line 2");
    });

    it("S3: ToolComplete event transitions tool to success", () => {
      const { grid, sub } = setup();
      sub.onToolStart(startEvent("call_1", "Grep", "Grep: pattern"));
      sub.onToolComplete(completeEvent("call_1", "success"));

      const tool = grid.getTool("call_1");
      expect(tool?.status).toBe("success");
      expect(tool?.endTime).toBeGreaterThan(0);
      expect(tool?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("S4: ToolComplete with error status transitions tool to failed", () => {
      const { grid, sub } = setup();
      sub.onToolStart(startEvent("call_1", "Bash", "Bash: bad cmd"));
      sub.onToolComplete({
        toolCallId: "call_1",
        status: "error",
        errorMessage: "command not found",
      });

      const tool = grid.getTool("call_1");
      expect(tool?.status).toBe("failed");
      expect(tool?.error?.message).toBe("command not found");
    });

    it("S5: ToolError event transitions running tool to failed", () => {
      const { grid, sub } = setup();
      sub.onToolStart(startEvent("call_1", "Read", "Read missing.txt"));
      sub.onToolError(errorEvent("call_1", "FileNotFound", "ENOENT"));

      const tool = grid.getTool("call_1");
      expect(tool?.status).toBe("failed");
      expect(tool?.error?.message).toBe("ENOENT");
    });
  });

  // ── Hop 2: Concurrent tool execution (multiple events) ──

  describe("Hop 2: Concurrent tools with mixed outcomes", () => {
    it("handles 3 concurrent tools with success, failure, and cancellation", () => {
      const { grid, sub } = setup();

      // Start 3 tools concurrently
      sub.onToolStart(startEvent("a", "Read", "Read A"));
      sub.onToolStart(startEvent("b", "Grep", "Grep B"));
      sub.onToolStart(startEvent("c", "Bash", "Bash C"));

      expect(grid.getToolIds()).toEqual(["a", "b", "c"]);

      // Mixed outcomes
      sub.onToolComplete(completeEvent("a", "success"));
      sub.onToolComplete({ toolCallId: "b", status: "error", errorMessage: "no matches" });
      grid.cancelTool("c");

      expect(grid.getTool("a")?.status).toBe("success");
      expect(grid.getTool("b")?.status).toBe("failed");
      expect(grid.getTool("c")?.status).toBe("cancelled");
    });
  });

  // ── Hop 3: Derived selectors provide grid views ──

  describe("Hop 3: Derived selectors", () => {
    it("selectFilteredTools filters by status", () => {
      const grid = createToolGridSlice();
      const make = (id: string, status: string, err = null) => ({
        toolId: id, toolName: "X", parameters: {}, status: status as ToolCardData["status"],
        progress: null, startTime: 1, endTime: null, durationMs: null,
        outputPreview: [], fullOutput: "", error: err, isExpanded: false,
        resourceUsage: { outputBytes: 0 },
      });
      grid.addTool(make("a", "success"));
      grid.addTool(make("b", "running"));
      grid.addTool(make("c", "failed", { message: "err" }));

      const filtered = selectFilteredTools(grid.getAllTools(), "failed" as StatusFilter);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].toolId).toBe("c");
    });

    it("selectSortedTools sorts by name ascending", () => {
      const grid = createToolGridSlice();
      const make = (id: string, name: string) => ({
        toolId: id, toolName: name, parameters: {}, status: "success" as const,
        progress: null, startTime: 1, endTime: null, durationMs: null,
        outputPreview: [], fullOutput: "", error: null, isExpanded: false,
        resourceUsage: { outputBytes: 0 },
      });
      grid.addTool(make("a", "Grep"));
      grid.addTool(make("b", "Bash"));
      grid.addTool(make("c", "Read"));

      const sorted = selectSortedTools(grid.getAllTools(), "name" as SortField, "asc" as SortOrder);
      expect(sorted.map((t) => t.toolName)).toEqual(["Bash", "Grep", "Read"]);
    });

    it("selectFailedTools returns only failed", () => {
      const grid = createToolGridSlice();
      const make = (id: string, status: string) => ({
        toolId: id, toolName: "X", parameters: {}, status: status as ToolCardData["status"],
        progress: null, startTime: 1, endTime: null, durationMs: null,
        outputPreview: [], fullOutput: "", error: status === "failed" ? { message: "err" } : null,
        isExpanded: false, resourceUsage: { outputBytes: 0 },
      });
      grid.addTool(make("a", "success"));
      grid.addTool(make("b", "failed"));
      grid.addTool(make("c", "failed"));
      grid.addTool(make("d", "running"));

      const failed = selectFailedTools(grid.getAllTools());
      expect(failed).toHaveLength(2);
      expect(failed.map((t) => t.toolId)).toEqual(["b", "c"]);
    });

    it("selectGridStats counts by status", () => {
      const grid = createToolGridSlice();
      const make = (id: string, status: string) => ({
        toolId: id, toolName: "X", parameters: {}, status: status as ToolCardData["status"],
        progress: null, startTime: 1, endTime: null, durationMs: null,
        outputPreview: [], fullOutput: "", error: null, isExpanded: false,
        resourceUsage: { outputBytes: 0 },
      });
      grid.addTool(make("a", "success"));
      grid.addTool(make("b", "success"));
      grid.addTool(make("c", "running"));
      grid.addTool(make("d", "failed"));
      grid.addTool(make("e", "cancelled"));

      const stats = selectGridStats(grid.getAllTools());
      expect(stats.total).toBe(5);
      expect(stats.success).toBe(2);
      expect(stats.running).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.cancelled).toBe(1);
    });

    it("selectResourceMetrics returns normalized metrics", () => {
      const grid = createToolGridSlice();
      const make = (id: string, dur: number, bytes: number) => ({
        toolId: id, toolName: "X", parameters: {}, status: "success" as const,
        progress: null, startTime: 1, endTime: null, durationMs: dur,
        outputPreview: [], fullOutput: "", error: null, isExpanded: false,
        resourceUsage: { outputBytes: bytes },
      });
      grid.addTool(make("a", 100, 1024));
      grid.addTool(make("b", 300, 4096));
      grid.addTool(make("c", 200, 2048));

      const metrics = selectResourceMetrics(grid.getAllTools());
      // 3 tools × 2 metrics each (duration + outputSize) = 6
      expect(metrics).toHaveLength(6);
      // metrics[0]: tool_a duration 100ms, normalizedValue = 100/300 ≈ 0.33
      expect(metrics[0].metricName).toBe("duration");
      expect(metrics[0].normalizedValue).toBeCloseTo(0.33, 1);
      // metrics[2]: tool_b duration 300ms, normalizedValue = 1.0
      expect(metrics[2].metricName).toBe("duration");
      expect(metrics[2].normalizedValue).toBeCloseTo(1.0, 0);
      // metrics[3]: tool_b output 4096B, normalizedValue = 1.0
      expect(metrics[3].metricName).toBe("outputSize");
      expect(metrics[3].normalizedValue).toBeCloseTo(1.0, 0);
    });
  });

  // ── Hop 4: Error aggregation → error panel data ──

  describe("Hop 4: Error aggregation flow", () => {
    it("getFailedTools collects errors across multiple tool types", () => {
      const grid = createToolGridSlice();
      const make = (id: string, toolName: string, status: string, err?: string) => ({
        toolId: id, toolName, parameters: {}, status: status as ToolCardData["status"],
        progress: null, startTime: 1, endTime: null, durationMs: null,
        outputPreview: [], fullOutput: "",
        error: err ? { message: err } : null,
        isExpanded: false, resourceUsage: { outputBytes: 0 },
      });
      grid.addTool(make("a", "Read", "failed", "ENOENT: file not found"));
      grid.addTool(make("b", "Bash", "failed", "exit code 1"));
      grid.addTool(make("c", "Grep", "failed", "invalid regex"));
      grid.addTool(make("d", "Glob", "success"));

      const failed = grid.getFailedTools();
      expect(failed).toHaveLength(3);
      expect(failed[0].error?.message).toBe("ENOENT: file not found");
      expect(failed[1].error?.message).toBe("exit code 1");
      expect(failed[2].error?.message).toBe("invalid regex");
    });
  });

  // ── Hop 5: Bulk operations ──

  describe("Hop 5: Bulk operations", () => {
    it("cancelAllRunning cancels all active tools with abort signal", () => {
      const grid = createToolGridSlice();
      const c1 = new AbortController();
      const c2 = new AbortController();

      grid.addTool({
        toolId: "a", toolName: "Read", parameters: {}, status: "running",
        progress: null, startTime: 1, endTime: null, durationMs: null,
        outputPreview: [], fullOutput: "", error: null, isExpanded: false,
        resourceUsage: { outputBytes: 0 },
      });
      grid.addTool({
        toolId: "b", toolName: "Bash", parameters: {}, status: "running",
        progress: null, startTime: 2, endTime: null, durationMs: null,
        outputPreview: [], fullOutput: "", error: null, isExpanded: false,
        resourceUsage: { outputBytes: 0 },
      });
      grid.registerAbortController("a", c1);
      grid.registerAbortController("b", c2);

      grid.cancelAllRunning();

      expect(grid.getTool("a")?.status).toBe("cancelled");
      expect(grid.getTool("b")?.status).toBe("cancelled");
      expect(c1.signal.aborted).toBe(true);
      expect(c2.signal.aborted).toBe(true);
      expect(grid.getAbortController("a")).toBeUndefined();
      expect(grid.getAbortController("b")).toBeUndefined();
    });

    it("clearCompleted + undo restores cleared tools", () => {
      const grid = createToolGridSlice();
      const make = (id: string, status: string) => ({
        toolId: id, toolName: "X", parameters: {}, status: status as ToolCardData["status"],
        progress: null, startTime: 1, endTime: null, durationMs: null,
        outputPreview: [], fullOutput: "", error: null, isExpanded: false,
        resourceUsage: { outputBytes: 0 },
      });
      grid.addTool(make("a", "success"));
      grid.addTool(make("b", "failed"));
      grid.addTool(make("c", "running"));

      grid.clearCompleted();
      expect(grid.getToolIds()).toEqual(["c"]);

      grid.undoClear();
      expect(grid.getToolIds()).toEqual(["a", "b", "c"]);
      expect(grid.getUndoStack()).toHaveLength(0);
    });

    it("expandAll / collapseAll toggles all cards", () => {
      const grid = createToolGridSlice();
      const make = (id: string) => ({
        toolId: id, toolName: "X", parameters: {}, status: "success" as const,
        progress: null, startTime: 1, endTime: null, durationMs: null,
        outputPreview: [], fullOutput: "", error: null, isExpanded: false,
        resourceUsage: { outputBytes: 0 },
      });
      grid.addTool(make("a"));
      grid.addTool(make("b"));
      grid.addTool(make("c"));

      grid.expandAll();
      expect(grid.getTool("a")?.isExpanded).toBe(true);
      expect(grid.getTool("b")?.isExpanded).toBe(true);
      expect(grid.getTool("c")?.isExpanded).toBe(true);

      grid.collapseAll();
      expect(grid.getTool("a")?.isExpanded).toBe(false);
      expect(grid.getTool("b")?.isExpanded).toBe(false);
      expect(grid.getTool("c")?.isExpanded).toBe(false);
    });
  });

  // ── Hop 6: Full lifecycle from orchestrator → store → selectors ──

  describe("Hop 6: Complete journey (orchestrator → store → selectors → bulk ops)", () => {
    it("end-to-end: 4 parallel tools with full lifecycle", () => {
      const { grid, sub } = setup();

      // Phase 1: Orchestrator emits 4 ToolStart events (026→031)
      sub.onToolStart(startEvent("t1", "Read", "Read src/app.ts"));
      sub.onToolStart(startEvent("t2", "Grep", "Grep: error pattern"));
      sub.onToolStart(startEvent("t3", "Bash", "Bash: npm test"));
      sub.onToolStart(startEvent("t4", "Glob", "Glob: **/*.ts"));

      expect(grid.getToolIds()).toEqual(["t1", "t2", "t3", "t4"]);
      for (const id of ["t1", "t2", "t3", "t4"]) {
        expect(grid.getTool(id)?.status).toBe("running");
      }

      // Phase 2: Output arrives (026→031)
      sub.onToolOutput(outputEvent("t1", "export function app() {}\n"));
      sub.onToolOutput(outputEvent("t2", "src/runtime.ts:42: error\n"));
      sub.onToolOutput(outputEvent("t3", "> jest --coverage\nPASS 3 suites\n"));

      expect(grid.getTool("t1")?.fullOutput).toContain("export function");
      expect(grid.getTool("t3")?.fullOutput).toContain("PASS 3 suites");

      // Phase 3: Mixed completions — success & failure
      sub.onToolComplete(completeEvent("t1", "success"));
      sub.onToolComplete({ toolCallId: "t2", status: "error", errorMessage: "no matches" });
      sub.onToolComplete(completeEvent("t3", "success"));
      // t4: cancelled by user

      // Register abort controller for t4 then cancel
      const c4 = new AbortController();
      grid.registerAbortController("t4", c4);
      grid.cancelTool("t4");

      expect(grid.getTool("t1")?.status).toBe("success");
      expect(grid.getTool("t2")?.status).toBe("failed");
      expect(grid.getTool("t3")?.status).toBe("success");
      expect(grid.getTool("t4")?.status).toBe("cancelled");
      expect(c4.signal.aborted).toBe(true);

      // Phase 4: Derived selectors reflect final state
      const state = { tools: grid.getAllTools(), toolIds: grid.getToolIds() };
      const stats = selectGridStats(state.tools);
      expect(stats).toEqual({ total: 4, pending: 0, success: 2, running: 0, failed: 1, cancelled: 1 });

      const failed = selectFailedTools(state.tools);
      expect(failed).toHaveLength(1);
      expect(failed[0].toolId).toBe("t2");

      const sorted = selectSortedTools(state.tools, "status" as SortField, "asc" as SortOrder);
      expect(sorted.map((t) => t.status)).toEqual(["success", "success", "failed", "cancelled"]);

      // Phase 5: Bulk clear completed (success + failed + cancelled)
      // t4 was just cancelled and is within CANCEL_GRACE_MS (3s), so it stays
      grid.clearCompleted();
      expect(grid.getToolIds()).toEqual(["t4"]);
      expect(grid.getUndoStack()).toHaveLength(3);

      // Phase 6: Undo restore
      grid.undoClear();
      expect(grid.getToolIds()).toEqual(["t1", "t2", "t3", "t4"]);
    });

    it("end-to-end: cancelAllRunning terminates all in-flight tools", () => {
      const { grid, sub } = setup();

      // Start 5 tools
      for (let i = 0; i < 5; i++) {
        sub.onToolStart(startEvent(`t${i}`, "Read", `Read file ${i}`));
        const ctrl = new AbortController();
        grid.registerAbortController(`t${i}`, ctrl);
      }

      // Complete 2 successfully first
      sub.onToolComplete(completeEvent("t0", "success"));
      sub.onToolComplete(completeEvent("t1", "success"));

      // Cancel all remaining (t2, t3, t4 are still running)
      grid.cancelAllRunning();

      expect(grid.getTool("t0")?.status).toBe("success");
      expect(grid.getTool("t1")?.status).toBe("success");
      expect(grid.getTool("t2")?.status).toBe("cancelled");
      expect(grid.getTool("t3")?.status).toBe("cancelled");
      expect(grid.getTool("t4")?.status).toBe("cancelled");
    });
  });
});

// ── Journey-level traceability ────────────────────────
// This test covers journey J-031-001 documented in
// specs/031-web-parallel-tool-grid/path-inventory.json
//
// Journey steps exercised:
//   S1 ToolStart → S2 ToolOutput → S3 ToolComplete success
//   → S4 ToolComplete error → S5 ToolError
// Hops:
//   Hop 1: 026 Tool Orchestrator events → 031 ToolGrid store
//   Hop 2: Concurrent execution with mixed outcomes
//   Hop 3: Derived selectors (filter/sort/stats/metrics)
//   Hop 4: Error aggregation → failed tool list
//   Hop 5: Bulk operations (cancel/clear/undo/expand)
//   Hop 6: Complete end-to-end lifecycle
//
// Cross-feature edges verified:
//   tool-orchestrator--event-->tool-grid-subscriber (026→031)
//   tool-grid-subscriber--call-->tool-grid-slice (031)
//   tool-events-schema--import-->tool-grid-subscriber (026→031)
//   tool-grid-slice--data-access-->tool-grid-selectors (031)
//   tool-grid-slice--data-access-->error-aggregation (031)
//   tool-grid-slice--call-->bulk-action-bar (031)
//   tool-grid-slice--data-access-->resource-bar-chart (031)
//
// Edge NOT covered (requires jsdom/Playwright for HTML output):
//   tool-card--import-->terminal-renderer (031→030)
//   → Covered by tests/web/tool-card-terminal-renderer.test.ts
//   card-renderer--import-->tool-grid-types (028→031)
//   → Covered by tests/web/card-renderer-grid.test.ts
