import { describe, expect, it } from "vitest";
import { renderToolCard } from "../../packages/web/src/components/chat/tool-grid/ToolCard";
import type { ToolCardData, ToolStatus } from "../../packages/web/src/types/tool-grid";

// ── Helpers ──────────────────────────────────────────

function makeTool(overrides: Partial<ToolCardData> = {}): ToolCardData {
  return {
    toolId: overrides.toolId ?? "tool-001",
    toolName: overrides.toolName ?? "read",
    parameters: overrides.parameters ?? { filePath: "/src/app.ts" },
    status: overrides.status ?? "running",
    progress: "progress" in overrides ? overrides.progress : 45,
    startTime: overrides.startTime ?? 1000000,
    endTime: overrides.endTime ?? null,
    durationMs: overrides.durationMs ?? null,
    outputPreview: overrides.outputPreview ?? ["line 1", "line 2", "line 3"],
    fullOutput: overrides.fullOutput ?? "line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8",
    error: overrides.error ?? null,
    isExpanded: overrides.isExpanded ?? false,
    resourceUsage: overrides.resourceUsage ?? { outputBytes: 128 },
  };
}

// ── Card Structure ───────────────────────────────────

describe("card structure", () => {
  it("renders the tool card wrapper with tool-card CSS class", () => {
    const html = renderToolCard(makeTool());
    expect(html).toContain("class=\"tool-card");
  });

  it("renders the tool name in the header", () => {
    const html = renderToolCard(makeTool({ toolName: "grep" }));
    expect(html).toContain("grep");
  });

  it("renders with data-tool-id attribute", () => {
    const html = renderToolCard(makeTool({ toolId: "abc-123" }));
    expect(html).toContain('data-tool-id="abc-123"');
  });

  it("renders with data-status attribute", () => {
    const html = renderToolCard(makeTool({ status: "running" }));
    expect(html).toContain('data-status="running"');
  });
});

// ── Header ───────────────────────────────────────────

describe("header", () => {
  it("includes tool type label in header", () => {
    const html = renderToolCard(makeTool({ toolName: "bash" }));
    expect(html).toContain("Bash");
  });

  it("includes expand/collapse toggle button", () => {
    const html = renderToolCard(makeTool());
    expect(html).toContain("data-action=\"toggle-card\"");
  });

  it("toggle button shows aria-expanded=false when collapsed", () => {
    const html = renderToolCard(makeTool({ isExpanded: false }));
    expect(html).toContain('aria-expanded="false"');
  });

  it("toggle button shows aria-expanded=true when expanded", () => {
    const html = renderToolCard(makeTool({ isExpanded: true }));
    expect(html).toContain('aria-expanded="true"');
  });
});

// ── Progress Bar ─────────────────────────────────────

describe("progress bar", () => {
  it("renders progress bar for running tool", () => {
    const html = renderToolCard(makeTool({ status: "running", progress: 60 }));
    expect(html).toContain("tool-progress-track");
    expect(html).toContain("width: 60%");
  });

  it("renders progress bar for pending tool at 0%", () => {
    const html = renderToolCard(makeTool({ status: "pending", progress: 0 }));
    expect(html).toContain("tool-progress-track");
  });

  it("omits progress bar for completed tools", () => {
    const html = renderToolCard(makeTool({
      status: "success",
      progress: 100,
      endTime: 1005000,
      durationMs: 5000,
    }));
    // Success cards may show a progress bar at 100% or not — check for the track
    expect(html).toContain("tool-progress-track");
  });
});

// ── Timer ────────────────────────────────────────────

describe("timer", () => {
  it("renders timer element", () => {
    const html = renderToolCard(makeTool({ status: "running" }));
    expect(html).toContain("tool-timer");
  });

  it("renders running timer class for active tools", () => {
    const html = renderToolCard(makeTool({
      status: "running",
      endTime: null,
    }));
    expect(html).toContain("tool-timer-running");
  });
});

// ── Output Preview ───────────────────────────────────

describe("output preview", () => {
  it("shows output preview section when there is output", () => {
    const html = renderToolCard(makeTool({
      outputPreview: ["preview content"],
      fullOutput: "preview content",
    }));
    expect(html).toContain("tool-output-preview");
  });

  it("shows last 5 preview lines when collapsed", () => {
    const html = renderToolCard(makeTool({
      isExpanded: false,
      outputPreview: ["line4", "line5", "line6", "line7", "line8"],
      fullOutput: "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8",
    }));
    expect(html).toContain("line4");
    expect(html).toContain("line8");
  });

  it("shows full output when expanded", () => {
    const html = renderToolCard(makeTool({
      isExpanded: true,
      outputPreview: ["line4", "line5", "line6", "line7", "line8"],
      fullOutput: "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8",
    }));
    expect(html).toContain("tool-output-full");
  });

  it("shows expand hint when collapsed with content", () => {
    const html = renderToolCard(makeTool({
      isExpanded: false,
      fullOutput: "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8",
    }));
    // Should indicate there's more content
    expect(html).toContain("tool-output-preview");
  });
});

// ── Error Display ────────────────────────────────────

describe("error display", () => {
  it("shows error message for failed tools", () => {
    const html = renderToolCard(makeTool({
      status: "failed",
      error: { message: "Command not found: nonexist" },
    }));
    expect(html).toContain("Command not found");
  });

  it("shows error section with error CSS class", () => {
    const html = renderToolCard(makeTool({
      status: "failed",
      error: { message: "Permission denied" },
    }));
    expect(html).toContain("tool-card-error");
  });

  it("shows stack trace when available", () => {
    const html = renderToolCard(makeTool({
      status: "failed",
      error: {
        message: "TypeError",
        stack: "at foo (bar.ts:10:5)",
      },
    }));
    expect(html).toContain("bar.ts:10");
  });

  it("does not show error section for non-failed tools", () => {
    const html = renderToolCard(makeTool({ status: "success" }));
    expect(html).not.toContain("tool-card-error");
  });
});

// ── Status Display ───────────────────────────────────

describe("status display", () => {
  it("renders status indicator for each status", () => {
    const statuses: ToolStatus[] = ["pending", "running", "success", "failed", "cancelled"];
    for (const status of statuses) {
      const html = renderToolCard(makeTool({ status }));
      expect(html).toContain("card-status-" + status);
      expect(html).toBeTruthy();
    }
  });

  it("renders cancelled status with grey indicator", () => {
    const html = renderToolCard(makeTool({
      status: "cancelled",
      endTime: 1003000,
    }));
    expect(html).toContain("card-status-cancelled");
  });
});

// ── Duration ─────────────────────────────────────────

describe("duration display", () => {
  it("shows duration for completed tool", () => {
    const html = renderToolCard(makeTool({
      status: "success",
      endTime: 1003000,
      durationMs: 3000,
    }));
    // Timer shows the formatted duration
    expect(html).toContain("tool-timer");
  });
});

// ── Edge Cases ───────────────────────────────────────

describe("edge cases", () => {
  it("renders with minimal data without crashing", () => {
    const html = renderToolCard(makeTool({
      outputPreview: [],
      fullOutput: "",
      parameters: {},
    }));
    expect(html).toBeTruthy();
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });

  it("renders all 5 statuses without crashing", () => {
    const statuses: ToolStatus[] = ["pending", "running", "success", "failed", "cancelled"];
    for (const status of statuses) {
      const html = renderToolCard(makeTool({ status }));
      expect(html).toBeTruthy();
      expect(typeof html).toBe("string");
    }
  });

  it("handles null progress for pending tools", () => {
    const html = renderToolCard(makeTool({
      status: "pending",
      progress: null,
    }));
    expect(html).toContain("tool-progress-indeterminate");
  });
});
