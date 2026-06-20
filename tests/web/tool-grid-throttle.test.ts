import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createToolGridSlice } from "../../packages/web/src/store/slices/tool-grid.slice";
import type { ToolCardData } from "../../packages/web/src/types/tool-grid";

function makeTool(overrides: Partial<ToolCardData> = {}): ToolCardData {
  return {
    toolId: "t1",
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

describe("T018 · Output Preview Throttling", () => {
  // ── Throttle: same tool within 100ms only updates preview once ──

  it("first append flushes preview immediately", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.appendOutput("t1", "line 1\n");
    const tool = slice.getTool("t1");
    expect(tool?.outputPreview).toEqual(["line 1\n"]);
  });

  it("second append within throttle window does NOT update preview", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.appendOutput("t1", "line 1\n");
    // This call is within the same synchronous tick, well within 100ms
    slice.appendOutput("t1", "line 2\n");
    const tool = slice.getTool("t1");
    // Preview still has only first line (second is buffered)
    expect(tool?.outputPreview).toEqual(["line 1\n"]);
    // But fullOutput accumulates in real-time
    expect(tool?.fullOutput).toBe("line 1\nline 2\n");
  });

  it("multiple rapid appends within throttle window buffer all chunks", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.appendOutput("t1", "line 1\n");
    slice.appendOutput("t1", "line 2\n");
    slice.appendOutput("t1", "line 3\n");
    slice.appendOutput("t1", "line 4\n");
    // Preview only shows first (immediate) flush
    expect(slice.getTool("t1")?.outputPreview).toEqual(["line 1\n"]);
    // fullOutput has everything
    expect(slice.getTool("t1")?.fullOutput).toBe("line 1\nline 2\nline 3\nline 4\n");
  });

  // ── Throttle expiry: after 100ms, next append flushes immediately ──

  it("throttle expiry: append after 100ms flushes immediately", () => {
    vi.useFakeTimers();
    try {
      const slice = createToolGridSlice();
      slice.addTool(makeTool({ toolId: "t1" }));
      slice.appendOutput("t1", "line 1\n");
      // First preview flushed immediately
      expect(slice.getTool("t1")?.outputPreview).toEqual(["line 1\n"]);

      // Advance past throttle window
      vi.advanceTimersByTime(150);

      slice.appendOutput("t1", "line 2\n");
      // Should flush immediately because throttle expired
      expect(slice.getTool("t1")?.outputPreview).toEqual(["line 1\n", "line 2\n"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("throttle expiry flushes previously buffered chunks plus new content", () => {
    vi.useFakeTimers();
    try {
      const slice = createToolGridSlice();
      slice.addTool(makeTool({ toolId: "t1" }));
      slice.appendOutput("t1", "line 1\n"); // immediate flush
      slice.appendOutput("t1", "line 2\n"); // buffered
      slice.appendOutput("t1", "line 3\n"); // buffered

      vi.advanceTimersByTime(120);

      // This call flushes because throttle expired — includes all pending chunks
      slice.appendOutput("t1", "line 4\n");
      expect(slice.getTool("t1")?.outputPreview).toEqual([
        "line 1\n", "line 2\n", "line 3\n", "line 4\n",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  // ── Independent per-tool throttling ──

  it("different tools have independent throttle windows", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "a" }));
    slice.addTool(makeTool({ toolId: "b" }));

    // First append on both tools — both flush immediately
    slice.appendOutput("a", "a1\n");
    slice.appendOutput("b", "b1\n");
    expect(slice.getTool("a")?.outputPreview).toEqual(["a1\n"]);
    expect(slice.getTool("b")?.outputPreview).toEqual(["b1\n"]);

    // Second append on both — both buffered (independent)
    slice.appendOutput("a", "a2\n");
    slice.appendOutput("b", "b2\n");

    // Tool A preview unchanged, Tool B preview unchanged
    expect(slice.getTool("a")?.outputPreview).toEqual(["a1\n"]);
    expect(slice.getTool("b")?.outputPreview).toEqual(["b1\n"]);

    // fullOutput is still real-time for both
    expect(slice.getTool("a")?.fullOutput).toBe("a1\na2\n");
    expect(slice.getTool("b")?.fullOutput).toBe("b1\nb2\n");
  });

  // ── Force flush on tool terminal states ──

  it("completeTool flushes all pending preview chunks", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.appendOutput("t1", "line 1\n"); // immediate
    slice.appendOutput("t1", "line 2\n"); // buffered
    slice.appendOutput("t1", "line 3\n"); // buffered
    slice.completeTool("t1");
    const tool = slice.getTool("t1");
    expect(tool?.outputPreview).toEqual(["line 1\n", "line 2\n", "line 3\n"]);
    expect(tool?.status).toBe("success");
  });

  it("failTool flushes all pending preview chunks", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.appendOutput("t1", "line 1\n");
    slice.appendOutput("t1", "line 2\n");
    slice.failTool("t1", { message: "crash" });
    const tool = slice.getTool("t1");
    expect(tool?.outputPreview).toEqual(["line 1\n", "line 2\n"]);
    expect(tool?.status).toBe("failed");
  });

  it("cancelTool flushes all pending preview chunks", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.appendOutput("t1", "line 1\n");
    slice.appendOutput("t1", "line 2\n");
    slice.cancelTool("t1");
    const tool = slice.getTool("t1");
    expect(tool?.outputPreview).toEqual(["line 1\n", "line 2\n"]);
    expect(tool?.status).toBe("cancelled");
  });

  // ── Preview cap at MAX_PREVIEW_LINES (5) with throttling ──

  it("pending chunks merged with existing preview respect 5-line cap", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));

    // Send 8 lines rapidly within throttle window
    for (let i = 0; i < 8; i++) {
      slice.appendOutput("t1", `line ${i}\n`);
    }

    // Force flush via complete
    slice.completeTool("t1");
    const tool = slice.getTool("t1");
    expect(tool?.outputPreview).toHaveLength(5);
    expect(tool?.outputPreview[0]).toBe("line 3\n");
    expect(tool?.outputPreview[4]).toBe("line 7\n");
    expect(tool?.fullOutput.split("\n").filter(Boolean)).toHaveLength(8);
  });

  // ── Output bytes tracking is real-time ──

  it("outputBytes is always real-time even during throttle window", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.appendOutput("t1", "hello\n");
    slice.appendOutput("t1", "world\n");
    // outputBytes reflects fullOutput, updated in real-time
    const tool = slice.getTool("t1");
    const expectedBytes = new TextEncoder().encode("hello\nworld\n").length;
    expect(tool?.resourceUsage.outputBytes).toBe(expectedBytes);
  });

  // ── Deferred scheduling works with fake timers ──

  it("schedules a deferred preview flush when within throttle window", () => {
    vi.useFakeTimers();
    try {
      const slice = createToolGridSlice();
      slice.addTool(makeTool({ toolId: "t1" }));
      slice.appendOutput("t1", "line 1\n");
      // second call within 0ms — schedules deferred flush
      slice.appendOutput("t1", "line 2\n");
      expect(slice.getTool("t1")?.outputPreview).toEqual(["line 1\n"]);

      // Fast-forward past the deferred timeout (setTimeout(fn, 0) in Node)
      vi.advanceTimersByTime(10);

      // After deferred flush fires, preview should include buffered chunk
      expect(slice.getTool("t1")?.outputPreview).toEqual(["line 1\n", "line 2\n"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("deferred flush is canceled if a new flush happens first", () => {
    vi.useFakeTimers();
    try {
      const slice = createToolGridSlice();
      slice.addTool(makeTool({ toolId: "t1" }));
      slice.appendOutput("t1", "A\n");
      slice.appendOutput("t1", "B\n"); // schedules deferred
      // Force immediate flush via completeTool (cancels the deferred)
      slice.completeTool("t1");
      const tool = slice.getTool("t1");

      // Should have both lines flushed by completeTool
      expect(tool?.outputPreview).toEqual(["A\n", "B\n"]);

      // Advancing timers should not cause issues (deferred was canceled)
      vi.advanceTimersByTime(100);
      expect(slice.getTool("t1")?.outputPreview).toEqual(["A\n", "B\n"]);
    } finally {
      vi.useRealTimers();
    }
  });

  // ── No-op on missing tool ──

  it("appendOutput on non-existent tool does not throw", () => {
    const slice = createToolGridSlice();
    expect(() => slice.appendOutput("missing", "data")).not.toThrow();
  });

  // ── Empty content ──

  it("appending empty string adds to fullOutput but not to preview chunks", () => {
    const slice = createToolGridSlice();
    slice.addTool(makeTool({ toolId: "t1" }));
    slice.appendOutput("t1", "");
    slice.completeTool("t1");
    const tool = slice.getTool("t1");
    expect(tool?.fullOutput).toBe("");
    expect(tool?.outputPreview).toEqual([""]);
  });
});
