import { describe, expect, it } from "vitest";
import { renderErrorAggregationPanel } from "../../packages/web/src/components/chat/tool-grid/ErrorAggregationPanel";
import type { ToolCardData } from "../../packages/web/src/types/tool-grid";

// ── Helpers ──────────────────────────────────────────

function makeFailedTool(overrides: Partial<ToolCardData> = {}): ToolCardData {
  return {
    toolId: overrides.toolId ?? "tool-fail-001",
    toolName: overrides.toolName ?? "bash",
    parameters: overrides.parameters ?? { command: "npm test" },
    status: "failed",
    progress: overrides.progress ?? null,
    startTime: overrides.startTime ?? 1000000,
    endTime: overrides.endTime ?? 1003000,
    durationMs: overrides.durationMs ?? 3000,
    outputPreview: overrides.outputPreview ?? [],
    fullOutput: overrides.fullOutput ?? "",
    error: overrides.error ?? { message: "Command failed with exit code 1" },
    isExpanded: overrides.isExpanded ?? false,
    resourceUsage: overrides.resourceUsage ?? { outputBytes: 256 },
  };
}

// ── Zero Errors ─────────────────────────────────────

describe("zero errors", () => {
  it("returns empty string when no failed tools", () => {
    const html = renderErrorAggregationPanel([], false);
    expect(html).toBe("");
  });

  it("returns empty string for empty array even when expanded", () => {
    const html = renderErrorAggregationPanel([], true);
    expect(html).toBe("");
  });
});

// ── Error Count Badge ───────────────────────────────

describe("error count badge", () => {
  it("shows '1 error' for a single failed tool", () => {
    const tools = [makeFailedTool()];
    const html = renderErrorAggregationPanel(tools, false);
    expect(html).toContain("1 error");
  });

  it("shows '3 errors' for three failed tools", () => {
    const tools = [
      makeFailedTool({ toolId: "f1" }),
      makeFailedTool({ toolId: "f2" }),
      makeFailedTool({ toolId: "f3" }),
    ];
    const html = renderErrorAggregationPanel(tools, false);
    expect(html).toContain("3 errors");
  });

  it("contains error count badge CSS class", () => {
    const html = renderErrorAggregationPanel([makeFailedTool()], false);
    expect(html).toContain("error-count-badge");
  });
});

// ── Panel Structure ─────────────────────────────────

describe("panel structure", () => {
  it("renders error panel wrapper with CSS class", () => {
    const html = renderErrorAggregationPanel([makeFailedTool()], false);
    expect(html).toContain("error-aggregation-panel");
  });

  it("renders with sticky CSS class", () => {
    const html = renderErrorAggregationPanel([makeFailedTool()], false);
    expect(html).toContain("error-panel-sticky");
  });

  it("renders toggle button for expand/collapse", () => {
    const html = renderErrorAggregationPanel([makeFailedTool()], false);
    expect(html).toContain("data-action=\"toggle-error-panel\"");
  });
});

// ── Expanded / Collapsed ────────────────────────────

describe("expanded / collapsed", () => {
  const tools = [
    makeFailedTool({ toolId: "f1", toolName: "read" }),
    makeFailedTool({ toolId: "f2", toolName: "bash" }),
  ];

  it("shows failed tool list when expanded", () => {
    const html = renderErrorAggregationPanel(tools, true);
    expect(html).toContain("error-item-list");
  });

  it("hides failed tool list when collapsed", () => {
    const html = renderErrorAggregationPanel(tools, false);
    expect(html).not.toContain("error-item-list");
  });

  it("toggle button shows aria-expanded=true when expanded", () => {
    const html = renderErrorAggregationPanel(tools, true);
    expect(html).toContain('aria-expanded="true"');
  });

  it("toggle button shows aria-expanded=false when collapsed", () => {
    const html = renderErrorAggregationPanel(tools, false);
    expect(html).toContain('aria-expanded="false"');
  });
});

// ── Error Items ─────────────────────────────────────

describe("error items", () => {
  const tools = [
    makeFailedTool({
      toolId: "err-1",
      toolName: "bash",
      error: { message: "Permission denied" },
    }),
    makeFailedTool({
      toolId: "err-2",
      toolName: "grep",
      error: { message: "No matches found" },
    }),
  ];

  it("renders tool name for each failed tool", () => {
    const html = renderErrorAggregationPanel(tools, true);
    expect(html).toContain("bash");
    expect(html).toContain("grep");
  });

  it("renders error message for each failed tool", () => {
    const html = renderErrorAggregationPanel(tools, true);
    expect(html).toContain("Permission denied");
    expect(html).toContain("No matches found");
  });

  it("each error item has data-tool-id for scroll-to-target", () => {
    const html = renderErrorAggregationPanel(tools, true);
    expect(html).toContain('data-tool-id="err-1"');
    expect(html).toContain('data-tool-id="err-2"');
  });

  it("each error item has data-action for click handling", () => {
    const html = renderErrorAggregationPanel(tools, true);
    expect(html).toContain('data-action="scroll-to-tool"');
  });

  it("each error item has hover CSS class", () => {
    const html = renderErrorAggregationPanel(tools, true);
    expect(html).toContain("error-item");
  });
});

// ── Edge Cases ──────────────────────────────────────

describe("edge cases", () => {
  it("renders with tool that has error but no stack", () => {
    const tools = [makeFailedTool({ error: { message: "Simple error" } })];
    const html = renderErrorAggregationPanel(tools, true);
    expect(html).toContain("Simple error");
    expect(html).toBeTruthy();
  });

  it("renders multiple errors in consistent order", () => {
    const tools = [
      makeFailedTool({ toolId: "a", error: { message: "First" } }),
      makeFailedTool({ toolId: "b", error: { message: "Second" } }),
      makeFailedTool({ toolId: "c", error: { message: "Third" } }),
    ];
    const html = renderErrorAggregationPanel(tools, true);
    const idxFirst = html.indexOf("First");
    const idxSecond = html.indexOf("Second");
    const idxThird = html.indexOf("Third");
    expect(idxFirst).toBeLessThan(idxSecond);
    expect(idxSecond).toBeLessThan(idxThird);
  });
});
