import { describe, expect, it } from "vitest";
import { renderResourceBarChart } from "../../packages/web/src/components/chat/tool-grid/ResourceBarChart";
import type { MetricName, ToolCardData } from "../../packages/web/src/types/tool-grid";

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
    resourceUsage: { outputBytes: 1024 },
    ...overrides,
  };
}

// ── Wrapper Structure ───────────────────────────────

describe("wrapper structure", () => {
  it("renders with resource-bar-chart CSS class", () => {
    const html = renderResourceBarChart({ tools: [], selectedMetric: "duration" });
    expect(html).toContain("resource-bar-chart");
  });

  it("returns truthy for empty tool list", () => {
    const html = renderResourceBarChart({ tools: [], selectedMetric: "duration" });
    expect(html).toBeTruthy();
  });
});

// ── Metric Tabs ─────────────────────────────────────

describe("metric tabs", () => {
  it("renders Duration tab button", () => {
    const html = renderResourceBarChart({ tools: [], selectedMetric: "duration" });
    expect(html).toContain("data-action=\"select-metric-duration\"");
  });

  it("renders Output Size tab button", () => {
    const html = renderResourceBarChart({ tools: [], selectedMetric: "outputSize" });
    expect(html).toContain("data-action=\"select-metric-outputSize\"");
  });

  it("marks Duration tab active when selected", () => {
    const html = renderResourceBarChart({ tools: [], selectedMetric: "duration" });
    expect(html).toContain("metric-active-duration");
  });

  it("marks Output Size tab active when selected", () => {
    const html = renderResourceBarChart({ tools: [], selectedMetric: "outputSize" });
    expect(html).toContain("metric-active-outputSize");
  });
});

// ── Bar Rows ────────────────────────────────────────

describe("bar rows", () => {
  const tools: ToolCardData[] = [
    makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 2000, resourceUsage: { outputBytes: 1024 } }),
    makeTool({ toolId: "b", toolName: "bash", status: "success", durationMs: 500, resourceUsage: { outputBytes: 512 } }),
  ];

  it("renders bar row for each completed tool", () => {
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).toContain("data-tool-id=\"a\"");
    expect(html).toContain("data-tool-id=\"b\"");
  });

  it("renders tool name in each row", () => {
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).toContain("read");
    expect(html).toContain("bash");
  });

  it("renders bar width proportional to max value", () => {
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    // tool "a" has max (2000ms), should be 100%
    expect(html).toContain("width:100%");
    // tool "b" has 500/2000 = 25%
    expect(html).toContain("width:25%");
  });

  it("renders bar width proportional for output size", () => {
    const html = renderResourceBarChart({ tools, selectedMetric: "outputSize" });
    // tool "a" has max (1024 bytes), should be 100%
    expect(html).toContain("width:100%");
    // tool "b" has 512/1024 = 50%
    expect(html).toContain("width:50%");
  });

  it("bar has tool-chart-bar CSS class", () => {
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).toContain("tool-chart-bar");
  });

  it("bar color matches tool status", () => {
    const failedTools: ToolCardData[] = [
      makeTool({ toolId: "c", toolName: "grep", status: "failed", durationMs: 3000, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderResourceBarChart({ tools: failedTools, selectedMetric: "duration" });
    expect(html).toContain("bar-color-failed");
  });
});

// ── Value Labels ────────────────────────────────────

describe("value labels", () => {
  it("renders duration value label", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 2300, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).toContain("2.3s");
  });

  it("renders output size value label", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 0, resourceUsage: { outputBytes: 1536 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "outputSize" });
    expect(html).toContain("1.5KB");
  });

  it("shows 0B for zero output size", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 0, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "outputSize" });
    expect(html).toContain("0B");
  });

  it("shows 0.0s for zero duration", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 0, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).toContain("0.0s");
  });
});

// ── Sorting ─────────────────────────────────────────

describe("sorting", () => {
  it("sorts tools descending by duration", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 1000, resourceUsage: { outputBytes: 0 } }),
      makeTool({ toolId: "b", toolName: "bash", status: "success", durationMs: 3000, resourceUsage: { outputBytes: 0 } }),
      makeTool({ toolId: "c", toolName: "grep", status: "success", durationMs: 2000, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    // bash (3000) should appear before grep (2000) is before read (1000)
    const bashPos = html.indexOf('data-tool-id="b"');
    const grepPos = html.indexOf('data-tool-id="c"');
    const readPos = html.indexOf('data-tool-id="a"');
    expect(bashPos).toBeLessThan(grepPos);
    expect(grepPos).toBeLessThan(readPos);
  });

  it("sorts tools descending by output size", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 0, resourceUsage: { outputBytes: 100 } }),
      makeTool({ toolId: "b", toolName: "bash", status: "success", durationMs: 0, resourceUsage: { outputBytes: 300 } }),
      makeTool({ toolId: "c", toolName: "grep", status: "success", durationMs: 0, resourceUsage: { outputBytes: 200 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "outputSize" });
    const bashPos = html.indexOf('data-tool-id="b"');
    const grepPos = html.indexOf('data-tool-id="c"');
    const readPos = html.indexOf('data-tool-id="a"');
    expect(bashPos).toBeLessThan(grepPos);
    expect(grepPos).toBeLessThan(readPos);
  });
});

// ── Filters non-completed tools ─────────────────────

describe("filters non-completed tools", () => {
  it("excludes pending tools", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "p", toolName: "read", status: "pending" }),
      makeTool({ toolId: "s", toolName: "bash", status: "success", durationMs: 500, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).not.toContain('data-tool-id="p"');
    expect(html).toContain('data-tool-id="s"');
  });

  it("excludes running tools", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "r", toolName: "grep", status: "running" }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).not.toContain('data-tool-id="r"');
  });

  it("includes cancelled tools", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "c", toolName: "read", status: "cancelled", durationMs: 100, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).toContain('data-tool-id="c"');
  });

  it("includes failed tools", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "f", toolName: "bash", status: "failed", durationMs: 200, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).toContain('data-tool-id="f"');
  });
});

// ── Edge Cases ──────────────────────────────────────

describe("edge cases", () => {
  it("renders empty chart section when no completed tools", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "r", toolName: "grep", status: "running" }),
      makeTool({ toolId: "p", toolName: "read", status: "pending" }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).toContain("resource-bar-chart");
    expect(html).toContain("no-data");
  });

  it("all bars 100% when single tool", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 500, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).toContain("width:100%");
  });

  it("handles null durationMs gracefully", () => {
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: null, resourceUsage: { outputBytes: 0 } }),
    ];
    const html = renderResourceBarChart({ tools, selectedMetric: "duration" });
    expect(html).toContain('data-tool-id="a"');
    expect(html).toContain("0.0s");
  });

  it("all combination of metrics and status", () => {
    const metrics: MetricName[] = ["duration", "outputSize"];
    const tools: ToolCardData[] = [
      makeTool({ toolId: "a", toolName: "read", status: "success", durationMs: 1000, resourceUsage: { outputBytes: 1024 } }),
      makeTool({ toolId: "b", toolName: "bash", status: "failed", durationMs: 500, resourceUsage: { outputBytes: 512 } }),
      makeTool({ toolId: "c", toolName: "grep", status: "cancelled", durationMs: 200, resourceUsage: { outputBytes: 256 } }),
    ];
    for (const metric of metrics) {
      const html = renderResourceBarChart({ tools, selectedMetric: metric });
      expect(html).toBeTruthy();
      expect(typeof html).toBe("string");
      expect(html.length).toBeGreaterThan(0);
    }
  });
});
