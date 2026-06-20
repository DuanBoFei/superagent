import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  createToolGridSubscriber,
  type ToolGridEventSubscriber,
} from "../../packages/web/src/hooks/use-tool-grid";
import { createToolGridSlice, type ToolGridSlice } from "../../packages/web/src/store/slices/tool-grid.slice";

// ── Helpers ──────────────────────────────────────────

function makeStartEvent(overrides: Record<string, unknown> = {}) {
  return {
    toolCallId: "call_1",
    toolName: "Read",
    title: "Read src/app.ts",
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeOutputEvent(overrides: Record<string, unknown> = {}) {
  return {
    toolCallId: "call_1",
    content: "line 1\n",
    ...overrides,
  };
}

function makeCompleteEvent(overrides: Record<string, unknown> = {}) {
  return {
    toolCallId: "call_1",
    status: "success" as const,
    ...overrides,
  };
}

function makeErrorEvent(overrides: Record<string, unknown> = {}) {
  return {
    toolCallId: "call_1",
    errorType: "ParseError",
    message: "Failed to parse",
    ...overrides,
  };
}

function setup(): { grid: ToolGridSlice; sub: ToolGridEventSubscriber } {
  const grid = createToolGridSlice();
  const sub = createToolGridSubscriber(grid);
  return { grid, sub };
}

// ── Tool Start ───────────────────────────────────────

describe("onToolStart", () => {
  it("adds a tool to the grid with running status", () => {
    const { grid, sub } = setup();
    const now = Date.now();
    sub.onToolStart(makeStartEvent({ timestamp: now }));

    const tool = grid.getTool("call_1");
    expect(tool).toBeDefined();
    expect(tool?.toolId).toBe("call_1");
    expect(tool?.toolName).toBe("Read");
    expect(tool?.status).toBe("running");
    expect(tool?.progress).toBe(0);
    expect(tool?.startTime).toBe(now);
  });

  it("records tool parameters in the card", () => {
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent({
      toolName: "Bash",
      title: "Bash: npm test",
    }));

    const tool = grid.getTool("call_1");
    expect(tool?.toolName).toBe("Bash");
    expect(tool?.parameters.title).toBe("Bash: npm test");
  });

  it("initializes empty output preview and full output", () => {
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent());

    const tool = grid.getTool("call_1");
    expect(tool?.outputPreview).toEqual([]);
    expect(tool?.fullOutput).toBe("");
  });

  it("no-ops on invalid payload (missing toolCallId)", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { grid, sub } = setup();
    sub.onToolStart({ toolName: "Read" }); // Missing toolCallId
    expect(grid.getToolIds()).toHaveLength(0);
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it("no-ops on non-object payload", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { grid, sub } = setup();
    sub.onToolStart(null);
    sub.onToolStart(42);
    sub.onToolStart("not an object");
    expect(grid.getToolIds()).toHaveLength(0);
    consoleWarn.mockRestore();
  });
});

// ── Tool Output ──────────────────────────────────────

describe("onToolOutput", () => {
  it("appends output to an existing tool", () => {
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent());
    sub.onToolOutput(makeOutputEvent({ content: "hello\n" }));
    sub.onToolOutput(makeOutputEvent({ content: "world\n" }));

    const tool = grid.getTool("call_1");
    expect(tool?.fullOutput).toBe("hello\nworld\n");
    expect(tool?.outputPreview).toEqual(["hello\n", "world\n"]);
  });

  it("is a no-op when tool does not exist", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { grid, sub } = setup();
    sub.onToolOutput(makeOutputEvent()); // No tool start
    expect(grid.getToolIds()).toHaveLength(0);
    // Should not crash — silently skip
    expect(() => sub.onToolOutput(makeOutputEvent())).not.toThrow();
    consoleWarn.mockRestore();
  });

  it("no-ops on invalid payload", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent());
    sub.onToolOutput({ content: "should have toolCallId" });
    const tool = grid.getTool("call_1");
    expect(tool?.fullOutput).toBe(""); // Unchanged
    consoleWarn.mockRestore();
  });

  it("appends output to completed tool (still accepts output for terminal tail)", () => {
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent({ toolCallId: "call_1", timestamp: Date.now() - 5000 }));
    sub.onToolComplete(makeCompleteEvent({ toolCallId: "call_1" }));
    // Late output after complete — still accepted (network ordering)
    sub.onToolOutput(makeOutputEvent({ toolCallId: "call_1", content: "late output\n" }));
    const tool = grid.getTool("call_1");
    expect(tool?.fullOutput).toContain("late output");
  });
});

// ── Tool Complete ────────────────────────────────────

describe("onToolComplete", () => {
  it("marks tool as success", () => {
    const { grid, sub } = setup();
    const startTime = Date.now() - 3000;
    sub.onToolStart(makeStartEvent({ timestamp: startTime }));
    sub.onToolComplete(makeCompleteEvent({ status: "success" }));

    const tool = grid.getTool("call_1");
    expect(tool?.status).toBe("success");
    expect(tool?.endTime).not.toBeNull();
    expect(tool?.durationMs).not.toBeNull();
    expect(tool!.durationMs!).toBeGreaterThan(0);
    expect(tool?.progress).toBe(100);
  });

  it("records duration from startTime to complete time", () => {
    const { grid, sub } = setup();
    const startTime = Date.now() - 5000;
    sub.onToolStart(makeStartEvent({ timestamp: startTime }));
    sub.onToolComplete(makeCompleteEvent());

    const tool = grid.getTool("call_1");
    expect(tool!.durationMs!).toBeGreaterThanOrEqual(4900); // ~5s
  });

  it("marks tool as failed on error status with provided error info", () => {
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent());
    sub.onToolComplete(makeCompleteEvent({
      status: "error",
      errorType: "RuntimeError",
      errorMessage: "ENOENT: no such file",
      stackTrace: "at Object.<anonymous> (file.ts:10:5)",
    }));

    const tool = grid.getTool("call_1");
    expect(tool?.status).toBe("failed");
    expect(tool?.error?.message).toBe("ENOENT: no such file");
    expect(tool?.endTime).not.toBeNull();
  });

  it("is a no-op when tool does not exist", () => {
    const { grid, sub } = setup();
    expect(() => sub.onToolComplete(makeCompleteEvent())).not.toThrow();
  });

  it("is a no-op when tool already completed (idempotent)", () => {
    const { grid, sub } = setup();
    const startTime = Date.now() - 10000;
    sub.onToolStart(makeStartEvent({ timestamp: startTime }));
    sub.onToolComplete(makeCompleteEvent());

    const firstEndTime = grid.getTool("call_1")?.endTime;

    // Attempt to complete again
    sub.onToolComplete(makeCompleteEvent({ status: "success" }));
    const tool = grid.getTool("call_1");
    expect(tool?.endTime).toBe(firstEndTime); // Unchanged
  });

  it("is a no-op when tool already failed and another complete arrives", () => {
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent());
    sub.onToolError(makeErrorEvent({ message: "first error" }));

    const errorMsg = grid.getTool("call_1")?.error?.message;
    expect(errorMsg).toBe("first error");

    // Late complete after error → idempotent
    sub.onToolComplete(makeCompleteEvent({ status: "success" }));
    expect(grid.getTool("call_1")?.status).toBe("failed"); // Not overwritten
    expect(grid.getTool("call_1")?.error?.message).toBe("first error");
  });
});

// ── Tool Error ───────────────────────────────────────

describe("onToolError", () => {
  it("marks tool as failed with error details", () => {
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent());
    sub.onToolError(makeErrorEvent({
      errorType: "NetworkError",
      message: "Connection timeout",
      stackTrace: "at connect (net.ts:42:12)",
    }));

    const tool = grid.getTool("call_1");
    expect(tool?.status).toBe("failed");
    expect(tool?.error?.message).toBe("Connection timeout");
    expect(tool?.error?.stack).toBe("at connect (net.ts:42:12)");
    expect(tool?.endTime).not.toBeNull();
  });

  it("is a no-op when tool does not exist", () => {
    const { grid, sub } = setup();
    expect(() => sub.onToolError(makeErrorEvent())).not.toThrow();
  });

  it("error after complete is a no-op (late event)", () => {
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent());
    sub.onToolComplete(makeCompleteEvent({ status: "success" }));

    // Late error event after success → idempotent
    sub.onToolError(makeErrorEvent({ message: "late error" }));
    expect(grid.getTool("call_1")?.status).toBe("success");
    expect(grid.getTool("call_1")?.error).toBeNull();
  });

  it("no-ops on invalid payload", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent());
    sub.onToolError({ message: "missing toolCallId" });
    expect(grid.getTool("call_1")?.status).toBe("running"); // Unchanged
    consoleWarn.mockRestore();
  });

  it("multiple errors for same tool: first error wins (idempotent)", () => {
    const { grid, sub } = setup();
    sub.onToolStart(makeStartEvent());
    sub.onToolError(makeErrorEvent({ message: "first error", stackTrace: "stack1" }));

    const endTime1 = grid.getTool("call_1")?.endTime;

    sub.onToolError(makeErrorEvent({ message: "second error", stackTrace: "stack2" }));

    const tool = grid.getTool("call_1");
    expect(tool?.error?.message).toBe("first error");
    expect(tool?.error?.stack).toBe("stack1");
    expect(tool?.endTime).toBe(endTime1); // Unchanged
  });
});

// ── Integration: Full lifecycle ──────────────────────

describe("full lifecycle integration", () => {
  it("tracks a tool through start → output → complete", () => {
    const { grid, sub } = setup();
    const startTime = Date.now();

    // Start
    sub.onToolStart(makeStartEvent({
      toolCallId: "lifecycle_1",
      toolName: "Bash",
      title: "Bash: npm install",
      timestamp: startTime,
    }));

    expect(grid.getTool("lifecycle_1")?.status).toBe("running");

    // Output streaming
    sub.onToolOutput(makeOutputEvent({ toolCallId: "lifecycle_1", content: "Installing...\n" }));
    sub.onToolOutput(makeOutputEvent({ toolCallId: "lifecycle_1", content: "Done.\n" }));

    const midTool = grid.getTool("lifecycle_1");
    expect(midTool?.fullOutput).toBe("Installing...\nDone.\n");
    expect(midTool?.status).toBe("running");

    // Complete
    sub.onToolComplete(makeCompleteEvent({ toolCallId: "lifecycle_1", status: "success" }));

    const finalTool = grid.getTool("lifecycle_1");
    expect(finalTool?.status).toBe("success");
    expect(finalTool?.durationMs).not.toBeNull();
    expect(finalTool?.endTime).not.toBeNull();
  });

  it("handles error lifecycle: start → output → error", () => {
    const { grid, sub } = setup();

    sub.onToolStart(makeStartEvent({ toolCallId: "err_1", toolName: "Grep", title: "Grep: pattern" }));
    sub.onToolOutput(makeOutputEvent({ toolCallId: "err_1", content: "Searching...\n" }));
    sub.onToolError(makeErrorEvent({
      toolCallId: "err_1",
      errorType: "PatternError",
      message: "Invalid regex",
    }));

    const tool = grid.getTool("err_1");
    expect(tool?.status).toBe("failed");
    expect(tool?.fullOutput).toBe("Searching...\n");
    expect(tool?.error?.message).toBe("Invalid regex");
    expect(tool?.endTime).not.toBeNull();
  });

  it("handles multiple tools concurrently", () => {
    const { grid, sub } = setup();

    sub.onToolStart(makeStartEvent({ toolCallId: "a", toolName: "Read", title: "Read a", timestamp: Date.now() }));
    sub.onToolStart(makeStartEvent({ toolCallId: "b", toolName: "Grep", title: "Grep b", timestamp: Date.now() }));
    sub.onToolStart(makeStartEvent({ toolCallId: "c", toolName: "Glob", title: "Glob c", timestamp: Date.now() }));

    expect(grid.getToolIds()).toEqual(["a", "b", "c"]);

    sub.onToolOutput(makeOutputEvent({ toolCallId: "a", content: "output a\n" }));
    sub.onToolComplete(makeCompleteEvent({ toolCallId: "a", status: "success" }));
    sub.onToolError(makeErrorEvent({ toolCallId: "b", errorType: "Err", message: "b failed" }));
    sub.onToolComplete(makeCompleteEvent({ toolCallId: "c", status: "success" }));

    expect(grid.getTool("a")?.status).toBe("success");
    expect(grid.getTool("b")?.status).toBe("failed");
    expect(grid.getTool("c")?.status).toBe("success");

    // All should have endTime
    expect(grid.getTool("a")?.endTime).not.toBeNull();
    expect(grid.getTool("b")?.endTime).not.toBeNull();
    expect(grid.getTool("c")?.endTime).not.toBeNull();
  });
});
