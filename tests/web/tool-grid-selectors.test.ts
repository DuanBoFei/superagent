import { describe, expect, it } from "vitest";
import {
  selectFilteredTools,
  selectSortedTools,
  selectFailedTools,
  selectResourceMetrics,
  selectGridStats,
} from "../../packages/web/src/store/slices/tool-grid.selectors";
import type {
  ToolCardData,
  ToolGridState,
  StatusFilter,
  SortField,
  SortOrder,
} from "../../packages/web/src/types/tool-grid";

// ── Helpers ──────────────────────────────────────────

function makeTool(overrides: Partial<ToolCardData> = {}): ToolCardData {
  return {
    toolId: "tool_1",
    toolName: "Read",
    parameters: { file_path: "src/app.ts" },
    status: "running",
    progress: 50,
    startTime: Date.now() - 5000,
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

function makeGridState(overrides: Partial<ToolGridState> = {}): ToolGridState {
  return {
    toolIds: [],
    tools: [],
    filters: { status: "all" },
    sortBy: "status",
    sortOrder: "asc",
    viewMode: "grid",
    errorExpanded: false,
    ...overrides,
  };
}

// ── selectFilteredTools ──────────────────────────────

describe("selectFilteredTools", () => {
  it("returns all tools when filter is all", () => {
    const tools = [
      makeTool({ toolId: "a", status: "running" }),
      makeTool({ toolId: "b", status: "success" }),
      makeTool({ toolId: "c", status: "failed" }),
      makeTool({ toolId: "d", status: "pending" }),
    ];
    const result = selectFilteredTools(tools, "all");
    expect(result).toHaveLength(4);
  });

  it("filters to running tools only", () => {
    const tools = [
      makeTool({ toolId: "a", status: "running" }),
      makeTool({ toolId: "b", status: "success" }),
      makeTool({ toolId: "c", status: "running" }),
    ];
    const result = selectFilteredTools(tools, "running");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.toolId)).toEqual(["a", "c"]);
  });

  it("filters to failed tools only", () => {
    const tools = [
      makeTool({ toolId: "a", status: "success" }),
      makeTool({ toolId: "b", status: "failed" }),
    ];
    const result = selectFilteredTools(tools, "failed");
    expect(result).toHaveLength(1);
    expect(result[0].toolId).toBe("b");
  });

  it("filters to completed tools (success + failed + cancelled)", () => {
    const tools = [
      makeTool({ toolId: "a", status: "success" }),
      makeTool({ toolId: "b", status: "failed" }),
      makeTool({ toolId: "c", status: "cancelled" }),
      makeTool({ toolId: "d", status: "running" }),
    ];
    const result = selectFilteredTools(tools, "completed");
    expect(result).toHaveLength(3);
    expect(result.map((t) => t.toolId)).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty input", () => {
    expect(selectFilteredTools([], "all")).toEqual([]);
    expect(selectFilteredTools([], "running")).toEqual([]);
  });
});

// ── selectSortedTools ─────────────────────────────────

describe("selectSortedTools", () => {
  const tools = [
    makeTool({ toolId: "a", toolName: "Read", status: "running", durationMs: 3000 }),
    makeTool({ toolId: "b", toolName: "Bash", status: "success", durationMs: 1000 }),
    makeTool({ toolId: "c", toolName: "Grep", status: "failed", durationMs: 5000 }),
    makeTool({ toolId: "d", toolName: "Glob", status: "cancelled", durationMs: null }),
    makeTool({ toolId: "e", toolName: "Write", status: "pending", durationMs: null }),
  ];

  it("sorts by status ascending (pending < running < success < failed < cancelled)", () => {
    const result = selectSortedTools(tools, "status", "asc");
    const statuses = result.map((t) => t.status);
    expect(statuses).toEqual(["pending", "running", "success", "failed", "cancelled"]);
  });

  it("sorts by status descending", () => {
    const result = selectSortedTools(tools, "status", "desc");
    const statuses = result.map((t) => t.status);
    expect(statuses).toEqual(["cancelled", "failed", "success", "running", "pending"]);
  });

  it("sorts by duration ascending (null/undefined at end)", () => {
    const result = selectSortedTools(tools, "duration", "asc");
    const ids = result.map((t) => t.toolId);
    // b(1000), a(3000), c(5000), then nulls: d, e
    expect(ids.slice(0, 3)).toEqual(["b", "a", "c"]);
    expect(ids.slice(3)).toContain("d");
    expect(ids.slice(3)).toContain("e");
  });

  it("sorts by duration descending (null/undefined at end)", () => {
    const result = selectSortedTools(tools, "duration", "desc");
    const ids = result.map((t) => t.toolId);
    expect(ids.slice(0, 3)).toEqual(["c", "a", "b"]);
  });

  it("sorts by name ascending (alphabetical)", () => {
    const result = selectSortedTools(tools, "name", "asc");
    const names = result.map((t) => t.toolName);
    // Bash, Glob, Grep, Read, Write
    expect(names).toEqual(["Bash", "Glob", "Grep", "Read", "Write"]);
  });

  it("sorts by name descending", () => {
    const result = selectSortedTools(tools, "name", "desc");
    const names = result.map((t) => t.toolName);
    expect(names).toEqual(["Write", "Read", "Grep", "Glob", "Bash"]);
  });

  it("returns empty array for empty input", () => {
    expect(selectSortedTools([], "status", "asc")).toEqual([]);
  });

  it("does not mutate original array", () => {
    const original = [...tools];
    selectSortedTools(tools, "status", "asc");
    expect(tools.map((t) => t.toolId)).toEqual(original.map((t) => t.toolId));
  });

  it("falls back to toolId for stable sort on ties", () => {
    const dupes = [
      makeTool({ toolId: "z", toolName: "Read", status: "running", durationMs: 1000 }),
      makeTool({ toolId: "a", toolName: "Read", status: "running", durationMs: 1000 }),
    ];
    const result = selectSortedTools(dupes, "duration", "asc");
    expect(result.map((t) => t.toolId)).toEqual(["a", "z"]);
  });
});

// ── selectFailedTools ─────────────────────────────────

describe("selectFailedTools", () => {
  it("returns only failed tools with their errors", () => {
    const tools = [
      makeTool({ toolId: "a", status: "success" }),
      makeTool({ toolId: "b", status: "failed", error: { message: "err1" } }),
      makeTool({ toolId: "c", status: "running" }),
      makeTool({ toolId: "d", status: "failed", error: { message: "err2", stack: "..." } }),
    ];
    const result = selectFailedTools(tools);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.toolId)).toEqual(["b", "d"]);
    expect(result[0].error?.message).toBe("err1");
    expect(result[1].error?.stack).toBe("...");
  });

  it("returns empty array when no failures", () => {
    const tools = [
      makeTool({ toolId: "a", status: "success" }),
      makeTool({ toolId: "b", status: "running" }),
    ];
    expect(selectFailedTools(tools)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(selectFailedTools([])).toEqual([]);
  });
});

// ── selectResourceMetrics ─────────────────────────────

describe("selectResourceMetrics", () => {
  const baseTime = Date.now();

  it("computes duration and outputSize metrics for completed tools", () => {
    const tools = [
      makeTool({
        toolId: "a",
        toolName: "Read",
        status: "success",
        startTime: baseTime,
        endTime: baseTime + 3000,
        durationMs: 3000,
        resourceUsage: { outputBytes: 2048 },
      }),
      makeTool({
        toolId: "b",
        toolName: "Bash",
        status: "success",
        startTime: baseTime,
        endTime: baseTime + 9000,
        durationMs: 9000,
        resourceUsage: { outputBytes: 1024 },
      }),
    ];
    const result = selectResourceMetrics(tools);

    // Duration metrics
    const durMetrics = result.filter((m) => m.metricName === "duration");
    expect(durMetrics).toHaveLength(2);
    // b has longest duration → normalizedValue should be 1.0
    const bDur = durMetrics.find((m) => m.toolId === "b")!;
    expect(bDur.normalizedValue).toBe(1.0);
    // a is 3000/9000 ≈ 0.33
    const aDur = durMetrics.find((m) => m.toolId === "a")!;
    expect(aDur.normalizedValue).toBeCloseTo(0.333, 2);
    expect(aDur.label).toBe("3.00s");

    // Output metrics
    const outMetrics = result.filter((m) => m.metricName === "outputSize");
    expect(outMetrics).toHaveLength(2);
    const aOut = outMetrics.find((m) => m.toolId === "a")!;
    expect(aOut.normalizedValue).toBe(1.0); // largest output
    const bOut = outMetrics.find((m) => m.toolId === "b")!;
    expect(bOut.normalizedValue).toBeCloseTo(0.5, 1);
  });

  it("formats duration label in seconds with 2 decimal places", () => {
    const tools = [
      makeTool({
        toolId: "a",
        toolName: "Read",
        status: "success",
        durationMs: 1234,
      }),
    ];
    const result = selectResourceMetrics(tools);
    const dur = result.find((m) => m.metricName === "duration")!;
    expect(dur.label).toBe("1.23s");
  });

  it("formats output size label as human-readable bytes", () => {
    const tools = [
      makeTool({
        toolId: "a",
        toolName: "Read",
        status: "success",
        resourceUsage: { outputBytes: 1024 },
      }),
    ];
    const result = selectResourceMetrics(tools);
    const out = result.find((m) => m.metricName === "outputSize")!;
    expect(out.label).toMatch(/1\.0\s*KB/i);
  });

  it("handles zero output bytes as minimum label", () => {
    const tools = [
      makeTool({
        toolId: "a",
        toolName: "Bash",
        status: "success",
        resourceUsage: { outputBytes: 0 },
      }),
    ];
    const result = selectResourceMetrics(tools);
    const out = result.find((m) => m.metricName === "outputSize")!;
    expect(out.label).toBe("0 B");
  });

  it("skips tools with null durationMs for duration metrics", () => {
    const tools = [
      makeTool({ toolId: "a", toolName: "Read", status: "success", durationMs: null }),
    ];
    const result = selectResourceMetrics(tools);
    const durMetrics = result.filter((m) => m.metricName === "duration");
    expect(durMetrics).toHaveLength(0);
  });

  it("handles single tool (normalizedValue = 1.0)", () => {
    const tools = [
      makeTool({
        toolId: "a",
        toolName: "Bash",
        status: "success",
        durationMs: 5000,
        resourceUsage: { outputBytes: 1024 },
      }),
    ];
    const result = selectResourceMetrics(tools);
    const dur = result.find((m) => m.metricName === "duration")!;
    expect(dur.normalizedValue).toBe(1.0);
    const out = result.find((m) => m.metricName === "outputSize")!;
    expect(out.normalizedValue).toBe(1.0);
  });

  it("returns empty array for empty input", () => {
    expect(selectResourceMetrics([])).toEqual([]);
  });

  it("normalizes all same-value metrics to 1.0", () => {
    const tools = [
      makeTool({
        toolId: "a", toolName: "X", status: "success",
        durationMs: 5000, resourceUsage: { outputBytes: 1024 },
      }),
      makeTool({
        toolId: "b", toolName: "Y", status: "success",
        durationMs: 5000, resourceUsage: { outputBytes: 1024 },
      }),
    ];
    const result = selectResourceMetrics(tools);
    for (const m of result) {
      expect(m.normalizedValue).toBe(1.0);
    }
  });

  it("includes only success/failed/cancelled tools (not running/pending)", () => {
    const tools = [
      makeTool({ toolId: "a", toolName: "Read", status: "running", durationMs: null }),
      makeTool({ toolId: "b", toolName: "Bash", status: "pending", durationMs: null }),
      makeTool({ toolId: "c", toolName: "Grep", status: "success", durationMs: 1000, resourceUsage: { outputBytes: 100 } }),
    ];
    const result = selectResourceMetrics(tools);
    const toolIds = [...new Set(result.map((m) => m.toolId))];
    expect(toolIds).toEqual(["c"]);
  });
});

// ── selectGridStats ───────────────────────────────────

describe("selectGridStats", () => {
  it("counts tools by status", () => {
    const tools = [
      makeTool({ toolId: "a", status: "pending" }),
      makeTool({ toolId: "b", status: "pending" }),
      makeTool({ toolId: "c", status: "running" }),
      makeTool({ toolId: "d", status: "running" }),
      makeTool({ toolId: "e", status: "running" }),
      makeTool({ toolId: "f", status: "success" }),
      makeTool({ toolId: "g", status: "failed" }),
      makeTool({ toolId: "h", status: "cancelled" }),
      makeTool({ toolId: "i", status: "cancelled" }),
    ];
    const stats = selectGridStats(tools);
    expect(stats).toEqual({
      pending: 2,
      running: 3,
      success: 1,
      failed: 1,
      cancelled: 2,
      total: 9,
    });
  });

  it("returns zero counts for empty array", () => {
    const stats = selectGridStats([]);
    expect(stats).toEqual({
      pending: 0,
      running: 0,
      success: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    });
  });

  it("correctly counts a single status group", () => {
    const tools = [
      makeTool({ toolId: "a", status: "success" }),
      makeTool({ toolId: "b", status: "success" }),
    ];
    const stats = selectGridStats(tools);
    expect(stats.success).toBe(2);
    expect(stats.total).toBe(2);
    expect(stats.running).toBe(0);
  });

  it("total equals sum of all status counts", () => {
    const tools = [
      makeTool({ toolId: "a", status: "pending" }),
      makeTool({ toolId: "b", status: "running" }),
      makeTool({ toolId: "c", status: "success" }),
      makeTool({ toolId: "d", status: "failed" }),
      makeTool({ toolId: "e", status: "cancelled" }),
    ];
    const stats = selectGridStats(tools);
    const sum = stats.pending + stats.running + stats.success + stats.failed + stats.cancelled;
    expect(sum).toBe(stats.total);
  });
});
