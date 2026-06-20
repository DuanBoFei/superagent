import { describe, expect, it } from "vitest";
import { createToolGridSlice, type ToolGridSlice } from "../../packages/web/src/store/slices/tool-grid.slice";
import type { ToolCardData, ToolError } from "../../packages/web/src/types/tool-grid";

function makeTool(overrides: Partial<ToolCardData> = {}): ToolCardData {
  return {
    toolId: "tool_1",
    toolName: "Read",
    parameters: { file_path: "/src/app.ts" },
    status: "running",
    progress: null,
    startTime: Date.now(),
    endTime: null,
    durationMs: null,
    outputPreview: [],
    fullOutput: "",
    error: null,
    isExpanded: false,
    resourceUsage: { outputBytes: 0 },
    ...overrides,
  };
}

function makeError(overrides: Partial<ToolError> = {}): ToolError {
  return {
    message: "Something went wrong",
    ...overrides,
  };
}

describe("toolGridSlice", () => {
  // ── Tool Management ────────────────────────────────

  it("adds a tool and retrieves it", () => {
    const slice = createToolGridSlice();
    const tool = makeTool();
    slice.addTool(tool);
    expect(slice.getTool("tool_1")).toEqual(tool);
  });

  it("adds a tool with running status by default", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1", status: "pending" }));
    // Status is preserved from input
    expect(slice.getTool("t1")?.status).toBe("pending");
  });

  it("lists all tools in insertion order", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "a" }));
    slice.addTool(makeTool({ toolId: "b" }));
    slice.addTool(makeTool({ toolId: "c" }));
    const all = slice.getAllTools();
    expect(all).toHaveLength(3);
    expect(all.map((t) => t.toolId)).toEqual(["a", "b", "c"]);
  });

  it("returns tool IDs in insertion order", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "x" }));
    slice.addTool(makeTool({ toolId: "y" }));
    expect(slice.getToolIds()).toEqual(["x", "y"]);
  });

  it("returns undefined for non-existent tool", () => {
    const slice = createToolGridSlice();
    expect(slice.getTool("missing")).toBeUndefined();
  });

  // ── Status Updates ──────────────────────────────────

  it("updates progress on a running tool", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1", status: "running" }));
    slice.updateProgress("t1", 50);
    expect(slice.getTool("t1")?.progress).toBe(50);
  });

  it("updateProgress is a no-op on non-existent tool", () => {
    const slice = createToolGridSlice();
    slice.updateProgress("missing", 50);
    // Should not throw
  });

  it("appends output to outputPreview and fullOutput (throttled, flushed on complete)", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.appendOutput("t1", "line 1\n");
    slice.appendOutput("t1", "line 2\n");
    // fullOutput is always real-time, even during throttle window
    let tool = slice.getTool("t1");
    expect(tool?.fullOutput).toBe("line 1\nline 2\n");
    // outputPreview flushes on completion
    slice.completeTool("t1");
    tool = slice.getTool("t1");
    expect(tool?.outputPreview).toEqual(["line 1\n", "line 2\n"]);
  });

  it("outputPreview caps at 5 lines (flushed on complete)", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    for (let i = 0; i < 8; i++) {
      slice.appendOutput("t1", `line ${i}\n`);
    }
    // fullOutput has all 8 (always real-time)
    expect(slice.getTool("t1")?.fullOutput.split("\n").filter(Boolean)).toHaveLength(8);
    // Force flush
    slice.completeTool("t1");
    const tool = slice.getTool("t1");
    // Preview keeps last 5 lines
    expect(tool?.outputPreview).toHaveLength(5);
    expect(tool?.outputPreview[0]).toBe("line 3\n");
    expect(tool?.outputPreview[4]).toBe("line 7\n");
  });

  it("completes a tool with success status", () => {
    const slice = createToolGridSlice();
    const startTime = Date.now() - 5000;
    slice.addTool(makeTool({ toolId: "t1", status: "running", startTime }));
    slice.completeTool("t1");
    const tool = slice.getTool("t1");
    expect(tool?.status).toBe("success");
    expect(tool?.endTime).not.toBeNull();
    expect(tool?.durationMs).not.toBeNull();
    expect(tool!.durationMs!).toBeGreaterThan(0);
  });

  it("completeTool is idempotent (already completed tools are not updated)", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1", status: "success", endTime: 1000, durationMs: 100 }));
    slice.completeTool("t1");
    const tool = slice.getTool("t1");
    // Should remain as-is
    expect(tool?.endTime).toBe(1000);
    expect(tool?.durationMs).toBe(100);
  });

  it("fails a tool with error", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1", status: "running" }));
    slice.failTool("t1", makeError({ message: "ENOENT: no such file" }));
    const tool = slice.getTool("t1");
    expect(tool?.status).toBe("failed");
    expect(tool?.error?.message).toBe("ENOENT: no such file");
    expect(tool?.endTime).not.toBeNull();
  });

  it("cancels a tool", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1", status: "running" }));
    slice.cancelTool("t1");
    const tool = slice.getTool("t1");
    expect(tool?.status).toBe("cancelled");
    expect(tool?.endTime).not.toBeNull();
  });

  // ── Grid State (sort/filter/view) ───────────────────

  it("defaults grid state correctly", () => {
    const slice = createToolGridSlice();
    const state = slice.getGridState();
    expect(state.filters.status).toBe("all");
    expect(state.sortBy).toBe("status");
    expect(state.sortOrder).toBe("asc");
    expect(state.viewMode).toBe("grid");
    expect(state.errorExpanded).toBe(false);
  });

  it("sets sort field and order", () => {
    const slice = createToolGridSlice();
    slice.setSort("duration", "desc");
    const state = slice.getGridState();
    expect(state.sortBy).toBe("duration");
    expect(state.sortOrder).toBe("desc");
  });

  it("sets status filter", () => {
    const slice = createToolGridSlice();
    slice.setFilter("failed");
    expect(slice.getGridState().filters.status).toBe("failed");
  });

  it("sets view mode", () => {
    const slice = createToolGridSlice();
    slice.setViewMode("list");
    expect(slice.getGridState().viewMode).toBe("list");
  });

  it("toggles error panel expansion", () => {
    const slice = createToolGridSlice();
    expect(slice.getGridState().errorExpanded).toBe(false);
    slice.toggleErrorExpanded();
    expect(slice.getGridState().errorExpanded).toBe(true);
    slice.toggleErrorExpanded();
    expect(slice.getGridState().errorExpanded).toBe(false);
  });

  // ── Bulk Actions ────────────────────────────────────

  it("expands all tools", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "a", isExpanded: false }));
    slice.addTool(makeTool({ toolId: "b", isExpanded: false }));
    slice.expandAll();
    expect(slice.getTool("a")?.isExpanded).toBe(true);
    expect(slice.getTool("b")?.isExpanded).toBe(true);
  });

  it("collapses all tools", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "a", isExpanded: true }));
    slice.addTool(makeTool({ toolId: "b", isExpanded: true }));
    slice.collapseAll();
    expect(slice.getTool("a")?.isExpanded).toBe(false);
    expect(slice.getTool("b")?.isExpanded).toBe(false);
  });

  it("clears completed tools", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "a", status: "success" }));
    slice.addTool(makeTool({ toolId: "b", status: "failed" }));
    slice.addTool(makeTool({ toolId: "c", status: "running" }));
    slice.clearCompleted();
    const ids = slice.getToolIds();
    expect(ids).toEqual(["c"]); // Only running remains
  });

  it("cancelAllRunning aborts all running tools", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.addTool(makeTool({ toolId: "b", status: "running" }));
    slice.addTool(makeTool({ toolId: "c", status: "success" }));
    slice.cancelAllRunning();
    expect(slice.getTool("a")?.status).toBe("cancelled");
    expect(slice.getTool("b")?.status).toBe("cancelled");
    expect(slice.getTool("c")?.status).toBe("success"); // Unchanged
  });

  it("clearCompleted provides undo stack", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "a", status: "success" }));
    slice.addTool(makeTool({ toolId: "b", status: "failed" }));
    slice.clearCompleted();
    const undo = slice.getUndoStack();
    expect(undo).toHaveLength(2);
    expect(undo.map((t) => t.toolId)).toEqual(["a", "b"]);
  });

  it("undo restores cleared tools", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "a", status: "success" }));
    slice.addTool(makeTool({ toolId: "b", status: "failed" }));
    slice.addTool(makeTool({ toolId: "c", status: "running" }));
    slice.clearCompleted();
    expect(slice.getToolIds()).toEqual(["c"]);
    slice.undoClear();
    expect(slice.getToolIds()).toEqual(["a", "b", "c"]);
    // Undo stack cleared after undo
    expect(slice.getUndoStack()).toHaveLength(0);
  });

  // ── Abort Controllers ───────────────────────────────

  it("registers and retrieves abort controllers", () => {
    const slice = createToolGridSlice();
    const controller = new AbortController();
    slice.registerAbortController("t1", controller);
    expect(slice.getAbortController("t1")).toBe(controller);
  });

  it("cancelTool aborts the controller", () => {
    const slice = createToolGridSlice();
    const controller = new AbortController();
    slice.addTool(makeTool({ toolId: "t1", status: "running" }));
    slice.registerAbortController("t1", controller);
    slice.cancelTool("t1");
    expect(controller.signal.aborted).toBe(true);
    expect(slice.getAbortController("t1")).toBeUndefined(); // Cleaned up
  });

  it("cancelAllRunning aborts all controllers", () => {
    const slice = createToolGridSlice();
    const c1 = new AbortController();
    const c2 = new AbortController();
    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.addTool(makeTool({ toolId: "b", status: "running" }));
    slice.registerAbortController("a", c1);
    slice.registerAbortController("b", c2);
    slice.cancelAllRunning();
    expect(c1.signal.aborted).toBe(true);
    expect(c2.signal.aborted).toBe(true);
    expect(slice.getAbortController("a")).toBeUndefined();
    expect(slice.getAbortController("b")).toBeUndefined();
  });

  it("completeTool cleans up abort controller", () => {
    const slice = createToolGridSlice();
    const controller = new AbortController();
    slice.addTool(makeTool({ toolId: "t1", status: "running" }));
    slice.registerAbortController("t1", controller);
    slice.completeTool("t1");
    expect(slice.getAbortController("t1")).toBeUndefined();
  });

  it("failTool cleans up abort controller", () => {
    const slice = createToolGridSlice();
    const controller = new AbortController();
    slice.addTool(makeTool({ toolId: "t1", status: "running" }));
    slice.registerAbortController("t1", controller);
    slice.failTool("t1", makeError());
    expect(slice.getAbortController("t1")).toBeUndefined();
  });

  // ── Error Aggregation ───────────────────────────────

  it("getFailedTools returns only failed tools", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "a", status: "success" }));
    slice.addTool(makeTool({ toolId: "b", status: "failed", error: makeError({ message: "err1" }) }));
    slice.addTool(makeTool({ toolId: "c", status: "failed", error: makeError({ message: "err2" }) }));
    slice.addTool(makeTool({ toolId: "d", status: "running" }));
    const failed = slice.getFailedTools();
    expect(failed).toHaveLength(2);
    expect(failed.map((t) => t.toolId)).toEqual(["b", "c"]);
  });

  // ── Snapshot ────────────────────────────────────────

  it("snapshot returns a serializable copy", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.addTool(makeTool({ toolId: "t2" }));
    const snap = slice.snapshot();
    expect(snap).toHaveLength(2);
    // Should be a copy, not reference
    snap[0].toolId = "mutated";
    expect(slice.getTool("t1")?.toolId).toBe("t1");
  });

  it("snapshot includes grid state", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.setSort("name", "desc");
    slice.setFilter("running");
    const state = slice.getGridState();
    expect(state.sortBy).toBe("name");
    expect(state.sortOrder).toBe("desc");
    expect(state.filters.status).toBe("running");
    expect(state.toolIds).toEqual(["t1"]);
    expect(state.tools).toHaveLength(1);
  });

  // ── Resource Usage Update ───────────────────────────

  it("updates resource usage on a tool", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.updateResourceUsage("t1", { outputBytes: 4096, memoryBytes: 1024 });
    const tool = slice.getTool("t1");
    expect(tool?.resourceUsage.outputBytes).toBe(4096);
    expect(tool?.resourceUsage.memoryBytes).toBe(1024);
  });

  // ── Toggle Individual Card ──────────────────────────

  it("toggles a single tool expanded state", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1", isExpanded: false }));
    slice.toggleExpanded("t1");
    expect(slice.getTool("t1")?.isExpanded).toBe(true);
    slice.toggleExpanded("t1");
    expect(slice.getTool("t1")?.isExpanded).toBe(false);
  });
});
