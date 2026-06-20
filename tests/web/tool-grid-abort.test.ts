import { describe, expect, it, vi, beforeEach } from "vitest";
import { createToolGridSlice, type ToolGridSlice } from "../../packages/web/src/store/slices/tool-grid.slice";
import type { ToolCardData } from "../../packages/web/src/types/tool-grid";

// ── Helpers ────────────────────────────────────────

function makeTool(overrides: Partial<ToolCardData> = {}): ToolCardData {
  return {
    toolId: "t1",
    toolName: "read",
    parameters: {},
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

function freshSlice(): ToolGridSlice {
  return createToolGridSlice();
}

// ── AbortController Registration ────────────────────

describe("abort controller registration", () => {
  let slice: ToolGridSlice;

  beforeEach(() => {
    slice = freshSlice();
  });

  it("registers an AbortController for a tool", () => {
    const ctrl = new AbortController();
    slice.addTool(makeTool({ toolId: "a" }));
    slice.registerAbortController("a", ctrl);
    expect(slice.getAbortController("a")).toBe(ctrl);
  });

  it("returns undefined for unregistered tool", () => {
    slice.addTool(makeTool({ toolId: "a" }));
    expect(slice.getAbortController("a")).toBeUndefined();
    expect(slice.getAbortController("nonexistent")).toBeUndefined();
  });

  it("overwrites previous controller for same tool", () => {
    const ctrl1 = new AbortController();
    const ctrl2 = new AbortController();
    slice.addTool(makeTool({ toolId: "a" }));
    slice.registerAbortController("a", ctrl1);
    slice.registerAbortController("a", ctrl2);
    expect(slice.getAbortController("a")).toBe(ctrl2);
  });
});

// ── AbortController Cleanup on Complete/Fail ────────

describe("abort controller cleanup on lifecycle", () => {
  let slice: ToolGridSlice;

  beforeEach(() => {
    slice = freshSlice();
  });

  it("cleans up AbortController on completeTool", () => {
    const ctrl = new AbortController();
    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.registerAbortController("a", ctrl);
    slice.completeTool("a");
    expect(slice.getAbortController("a")).toBeUndefined();
  });

  it("cleans up AbortController on failTool", () => {
    const ctrl = new AbortController();
    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.registerAbortController("a", ctrl);
    slice.failTool("a", { message: "boom" });
    expect(slice.getAbortController("a")).toBeUndefined();
  });

  it("cleans up AbortController on cancelTool", () => {
    const ctrl = new AbortController();
    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.registerAbortController("a", ctrl);
    slice.cancelTool("a");
    expect(slice.getAbortController("a")).toBeUndefined();
  });

  it("does not thrown when completing tool without registered controller", () => {
    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    expect(() => slice.completeTool("a")).not.toThrow();
  });
});

// ── cancelAllRunning Abort Propagation ──────────────

describe("cancelAllRunning abort propagation", () => {
  let slice: ToolGridSlice;

  beforeEach(() => {
    slice = freshSlice();
  });

  it("aborts all running tools' AbortControllers", () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const ctrl1 = new AbortController();
    const ctrl2 = new AbortController();
    ctrl1.signal.addEventListener("abort", spy1);
    ctrl2.signal.addEventListener("abort", spy2);

    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.addTool(makeTool({ toolId: "b", status: "running" }));
    slice.addTool(makeTool({ toolId: "c", status: "success", durationMs: 100 }));
    slice.registerAbortController("a", ctrl1);
    slice.registerAbortController("b", ctrl2);

    slice.cancelAllRunning();

    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
    expect(slice.getAbortController("a")).toBeUndefined();
    expect(slice.getAbortController("b")).toBeUndefined();
  });

  it("cancels pending tools as well as running", () => {
    const spy = vi.fn();
    const ctrl = new AbortController();
    ctrl.signal.addEventListener("abort", spy);

    slice.addTool(makeTool({ toolId: "p", status: "pending" }));
    slice.registerAbortController("p", ctrl);

    slice.cancelAllRunning();

    expect(spy).toHaveBeenCalledOnce();
    const tool = slice.getTool("p");
    expect(tool?.status).toBe("cancelled");
  });

  it("does not abort controllers for already-completed tools", () => {
    const spy = vi.fn();
    const ctrl = new AbortController();
    ctrl.signal.addEventListener("abort", spy);

    slice.addTool(makeTool({ toolId: "a", status: "success", durationMs: 100 }));
    // Register even though already completed (edge case)
    slice.registerAbortController("a", ctrl);

    slice.cancelAllRunning();

    // Completed tool should NOT be aborted
    expect(spy).not.toHaveBeenCalled();
    const tool = slice.getTool("a");
    expect(tool?.status).toBe("success"); // unchanged
  });

  it("handles cancelAllRunning with no registered controllers", () => {
    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.addTool(makeTool({ toolId: "b", status: "running" }));
    // No controllers registered

    expect(() => slice.cancelAllRunning()).not.toThrow();
    expect(slice.getTool("a")?.status).toBe("cancelled");
    expect(slice.getTool("b")?.status).toBe("cancelled");
  });
});

// ── Individual cancelTool Abort ─────────────────────

describe("cancelTool abort signal", () => {
  it("calls abort on the tool's AbortController", () => {
    const slice = freshSlice();
    const spy = vi.fn();
    const ctrl = new AbortController();
    ctrl.signal.addEventListener("abort", spy);

    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.registerAbortController("a", ctrl);
    slice.cancelTool("a");

    expect(spy).toHaveBeenCalledOnce();
  });

  it("handles cancelTool without registered controller", () => {
    const slice = freshSlice();
    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    expect(() => slice.cancelTool("a")).not.toThrow();
    expect(slice.getTool("a")?.status).toBe("cancelled");
  });

  it("does not double-abort if cancelTool called twice", () => {
    const slice = freshSlice();
    const spy = vi.fn();
    const ctrl = new AbortController();
    ctrl.signal.addEventListener("abort", spy);

    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.registerAbortController("a", ctrl);
    slice.cancelTool("a");
    slice.cancelTool("a"); // Second call (status already cancelled)

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ── Cancelled Tool Grace Period ─────────────────────

describe("cancelled tool grace period", () => {
  it("records cancelledAt timestamp on cancelTool", () => {
    const slice = freshSlice();
    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.cancelTool("a");
    const tool = slice.getTool("a");
    expect(tool?.cancelledAt).toBeGreaterThan(0);
  });

  it("records cancelledAt timestamp on cancelAllRunning", () => {
    const slice = freshSlice();
    slice.addTool(makeTool({ toolId: "a", status: "running" }));
    slice.cancelAllRunning();
    const tool = slice.getTool("a");
    expect(tool?.cancelledAt).toBeGreaterThan(0);
  });

  it("clearCompleted excludes recently cancelled tools (within 3s)", () => {
    const slice = freshSlice();
    const now = Date.now();
    slice.addTool(makeTool({ toolId: "a", status: "cancelled", cancelledAt: now - 1000 }));
    slice.addTool(makeTool({ toolId: "b", status: "success", durationMs: 100 }));

    slice.clearCompleted();

    // Recently cancelled tool should NOT be cleared
    expect(slice.getTool("a")).toBeDefined();
    // Success tool should be cleared
    expect(slice.getTool("b")).toBeUndefined();
  });

  it("clearCompleted includes cancelled tools older than 3 seconds", () => {
    const slice = freshSlice();
    const now = Date.now();
    slice.addTool(makeTool({ toolId: "a", status: "cancelled", cancelledAt: now - 4000 }));

    slice.clearCompleted();

    // Old cancelled tool should be cleared
    expect(slice.getTool("a")).toBeUndefined();
  });

  it("clearCompleted excludes cancelled tools exactly at 3s boundary", () => {
    const slice = freshSlice();
    const now = Date.now();
    slice.addTool(makeTool({ toolId: "a", status: "cancelled", cancelledAt: now - 3000 }));

    slice.clearCompleted();

    // At exactly 3 seconds, still excluded (>= 3001ms needed)
    expect(slice.getTool("a")).toBeDefined();
  });

  it("undoClear restores cancelled tools with their cancelledAt", () => {
    const slice = freshSlice();
    const now = Date.now();
    // Must be older than CANCEL_GRACE_MS (3s) to be clearable
    slice.addTool(makeTool({ toolId: "a", status: "cancelled", cancelledAt: now - 4000 }));
    slice.clearCompleted();

    const undoStack = slice.getUndoStack();
    expect(undoStack.length).toBe(1);
    expect(undoStack[0].cancelledAt).toBe(now - 4000);

    slice.undoClear();
    const restored = slice.getTool("a");
    expect(restored).toBeDefined();
    expect(restored?.cancelledAt).toBe(now - 4000);
  });
});

// ── clearCompleted also cleans abort controllers ────

describe("clearCompleted abort cleanup", () => {
  it("cleans up AbortControllers for cleared tools", () => {
    const slice = freshSlice();
    const ctrl = new AbortController();
    slice.addTool(makeTool({ toolId: "a", status: "cancelled", cancelledAt: Date.now() - 5000 }));
    slice.registerAbortController("a", ctrl);

    slice.clearCompleted();

    expect(slice.getAbortController("a")).toBeUndefined();
  });
});
