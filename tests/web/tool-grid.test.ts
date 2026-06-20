import { describe, expect, it } from "vitest";
import { renderToolGrid } from "../../packages/web/src/components/chat/tool-grid/ToolGrid";
import type { SortField, SortOrder, StatusFilter, ToolCardData, ViewMode, MetricName } from "../../packages/web/src/types/tool-grid";

// ── Helpers ────────────────────────────────────────

function makeTool(overrides: Partial<ToolCardData> = {}): ToolCardData {
  return {
    toolId: "t1",
    toolName: "read",
    parameters: {},
    status: "running",
    progress: null,
    startTime: 1000,
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

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    tools: [] as ToolCardData[],
    containerWidth: 1024,
    sortBy: "status" as SortField,
    sortOrder: "asc" as SortOrder,
    filterStatus: "all" as StatusFilter,
    viewMode: "grid" as ViewMode,
    errorExpanded: false,
    runningCount: 0,
    completedCount: 0,
    showUndo: false,
    selectedResourceMetric: "duration" as MetricName,
    scrollTop: 0,
    viewportHeight: 800,
    ...overrides,
  };
}

// ── Wrapper Structure ───────────────────────────────

describe("wrapper structure", () => {
  it("renders with tool-grid CSS class", () => {
    const html = renderToolGrid(baseProps());
    expect(html).toContain("tool-grid");
  });

  it("renders ErrorAggregationPanel section", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "f1", toolName: "bash", status: "failed", error: { message: "boom" } }),
    ];
    const html = renderToolGrid(baseProps({ tools }));
    expect(html).toContain("error-aggregation-panel");
  });

  it("renders BulkActionBar section", () => {
    const html = renderToolGrid(baseProps({ runningCount: 3, completedCount: 2 }));
    expect(html).toContain("bulk-action-bar");
  });

  it("renders SortFilterControls section", () => {
    const html = renderToolGrid(baseProps());
    expect(html).toContain("sort-filter-controls");
  });

  it("renders ViewToggle section", () => {
    const html = renderToolGrid(baseProps());
    expect(html).toContain("view-toggle");
  });

  it("renders ResourceBarChart section", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 500, resourceUsage: { outputBytes: 100 } }),
    ];
    const html = renderToolGrid(baseProps({ tools }));
    expect(html).toContain("resource-bar-chart");
  });

  it("renders tool cards for each tool", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "running" }),
      makeTool({ toolId: "b", toolName: "bash", status: "success", durationMs: 300, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderToolGrid(baseProps({ tools }));
    expect(html).toContain('data-tool-id="a"');
    expect(html).toContain('data-tool-id="b"');
  });
});

// ── Responsive Grid Columns ─────────────────────────

describe("responsive grid columns", () => {
  it("uses 1 column for width < 600", () => {
    const html = renderToolGrid(baseProps({ containerWidth: 500 }));
    expect(html).toContain("grid-cols-1");
  });

  it("uses 2 columns for 3-4 tools at 600 <= width < 1000", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "running" }),
      makeTool({ toolId: "b", toolName: "bash", status: "running" }),
      makeTool({ toolId: "c", toolName: "grep", status: "running" }),
    ];
    const html = renderToolGrid(baseProps({ tools, containerWidth: 800 }));
    expect(html).toContain("grid-cols-2");
  });

  it("uses 3 columns for 5+ tools at width >= 1000", () => {
    const tools: ToolCardData[] = Array.from({ length: 5 }, (_, i) =>
      makeTool({ toolId: `t${i}`, toolName: "read", status: "running" })
    );
    const html = renderToolGrid(baseProps({ tools, containerWidth: 1200 }));
    expect(html).toContain("grid-cols-3");
  });

  it("forces 1 column in list view mode regardless of width", () => {
    const html = renderToolGrid(baseProps({ containerWidth: 1200, viewMode: "list" }));
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("view-mode-list");
  });

  it("uses grid class in grid view mode", () => {
    const html = renderToolGrid(baseProps({ containerWidth: 1200, viewMode: "grid" }));
    expect(html).toContain("view-mode-grid");
  });

  it("1 tool stays at 1 column even with wide container", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "running" }),
    ];
    const html = renderToolGrid(baseProps({ tools, containerWidth: 1200 }));
    expect(html).toContain("grid-cols-1");
  });
});

// ── Virtual Scroll Integration ──────────────────────

describe("virtual scroll integration", () => {
  it("shows virtual scroll wrapper when tool count > 20", () => {
    const tools: ToolCardData[] = Array.from({ length: 25 }, (_, i) =>
      makeTool({ toolId: `t${i}`, toolName: "read", status: "running" })
    );
    const html = renderToolGrid(baseProps({ tools }));
    expect(html).toContain("virtual-scroll-container");
  });

  it("no virtual scroll wrapper when tool count <= 20", () => {
    const tools: ToolCardData[] = Array.from({ length: 5 }, (_, i) =>
      makeTool({ toolId: `t${i}`, toolName: "read", status: "running" })
    );
    const html = renderToolGrid(baseProps({ tools }));
    expect(html).not.toContain("virtual-scroll-container");
  });
});

// ── Empty State ─────────────────────────────────────

describe("empty state", () => {
  it("renders empty state message when no tools match filter", () => {
    const html = renderToolGrid(baseProps({ tools: [], filterStatus: "running" }));
    expect(html).toContain("tool-grid");
    expect(html).toContain("tool-grid-empty");
  });

  it("renders empty state with message text", () => {
    const html = renderToolGrid(baseProps({ tools: [], filterStatus: "failed" }));
    expect(html).toContain("No tools");
  });
});

// ── Error Panel Integration ─────────────────────────

describe("error panel integration", () => {
  it("renders error panel with correct isExpanded prop", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "f1", toolName: "bash", status: "failed", error: { message: "boom" } }),
    ];
    const expanded = renderToolGrid(baseProps({ tools, errorExpanded: true }));
    expect(expanded).toContain("error-item-list");

    const collapsed = renderToolGrid(baseProps({ tools, errorExpanded: false }));
    expect(collapsed).not.toContain("error-item-list");
  });

  it("does not render error panel when no failed tools", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 100, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderToolGrid(baseProps({ tools }));
    expect(html).not.toContain("error-aggregation-panel");
  });
});

// ── Bulk Action Bar Integration ─────────────────────

describe("bulk action bar integration", () => {
  it("passes runningCount and completedCount to BulkActionBar", () => {
    const html = renderToolGrid(baseProps({ runningCount: 4, completedCount: 3 }));
    expect(html).toContain("Cancel All (4)");
  });

  it("passes showUndo and undoRemainingSeconds to BulkActionBar", () => {
    const html = renderToolGrid(baseProps({ showUndo: true, undoRemainingSeconds: 3, completedCount: 3 }));
    expect(html).toContain("Undo (3s)");
  });
});

// ── Edge Cases ──────────────────────────────────────

describe("edge cases", () => {
  it("renders without crashing with all props at boundary values", () => {
    const tools: ToolCardData[] = Array.from({ length: 50 }, (_, i) =>
      makeTool({
        toolId: `t${i}`,
        toolName: "bash",
        status: i % 3 === 0 ? "success" : i % 3 === 1 ? "failed" : "running",
        error: i % 3 === 1 ? { message: `error ${i}` } : null,
        durationMs: i % 3 === 0 ? i * 100 : null,
        resourceUsage: { outputBytes: i * 100 },
      })
    );
    const html = renderToolGrid(baseProps({
      tools,
      containerWidth: 0,
      viewMode: "list",
      scrollTop: 9999,
      viewportHeight: 100,
      errorExpanded: true,
      showUndo: true,
      undoRemainingSeconds: 1,
    }));
    expect(html).toBeTruthy();
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });

  it("handles null durationMs and error in tools", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "pending", progress: 0 }),
      makeTool({ toolId: "b", toolName: "grep", status: "cancelled", durationMs: null, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderToolGrid(baseProps({ tools }));
    expect(html).toContain('data-tool-id="a"');
    expect(html).toContain('data-tool-id="b"');
  });

  it("applies sort selection to SortFilterControls", () => {
    const html = renderToolGrid(baseProps({ sortBy: "duration", sortOrder: "desc" }));
    expect(html).toContain('data-sort-selected="duration"');
    expect(html).toContain("sort-order-desc");
  });
});
