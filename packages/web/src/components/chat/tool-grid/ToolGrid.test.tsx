import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToolGrid } from "./ToolGrid";
import type { ToolCardData } from "../../../types/tool-grid";
import type { ToolTimerState } from "../../../hooks/use-tool-timer";

function makeTool(overrides?: Partial<ToolCardData>): ToolCardData {
  return {
    toolId: "tool-1",
    toolName: "read",
    parameters: { filePath: "src/app.ts" },
    status: "running",
    progress: 50,
    startTime: Date.now() - 5000,
    endTime: null,
    durationMs: null,
    outputPreview: ["line 1"],
    fullOutput: "line 1\nline 2",
    error: null,
    isExpanded: false,
    resourceUsage: { outputBytes: 0 },
    ...overrides,
  };
}

function makeTimer(overrides?: Partial<ToolTimerState>): ToolTimerState {
  return { formatted: "00:05", running: true, elapsedMs: 5000, ...overrides };
}

describe("ToolGrid", () => {
  const defaultProps = {
    tools: [] as ToolCardData[],
    containerWidth: 1024,
    sortBy: "status" as const,
    sortOrder: "asc" as const,
    filterStatus: "all" as const,
    viewMode: "grid" as const,
    errorExpanded: false,
    runningCount: 0,
    completedCount: 0,
    showUndo: false,
    selectedResourceMetric: "duration" as const,
    scrollTop: 0,
    viewportHeight: 800,
    timerStates: new Map(),
    bashOutputs: new Map(),
    onToggleCard: vi.fn(),
    onToggleErrorPanel: vi.fn(),
    onScrollToTool: vi.fn(),
    onCancelAll: vi.fn(),
    onExpandAll: vi.fn(),
    onCollapseAll: vi.fn(),
    onClearCompleted: vi.fn(),
    onUndoClear: vi.fn(),
    onSetView: vi.fn(),
    onSortBy: vi.fn(),
    onToggleSortOrder: vi.fn(),
    onFilterBy: vi.fn(),
    onSelectMetric: vi.fn(),
  };

  it("renders empty state when no tools", () => {
    render(<ToolGrid {...defaultProps} />);
    expect(screen.getByText("No tools matching current filter")).toBeDefined();
  });

  it("renders tool cards for each tool", () => {
    const tools = [
      makeTool({ toolId: "1", toolName: "read" }),
      makeTool({ toolId: "2", toolName: "grep" }),
    ];
    const timerStates = new Map([
      ["1", makeTimer()],
      ["2", makeTimer()],
    ]);
    render(<ToolGrid {...defaultProps} tools={tools} timerStates={timerStates} />);
    const cards = document.querySelectorAll(".tool-card");
    expect(cards.length).toBe(2);
  });

  it("renders error aggregation panel when failed tools exist", () => {
    const tools = [
      makeTool({ toolId: "1", status: "failed", error: { message: "Error" } }),
    ];
    render(<ToolGrid {...defaultProps} tools={tools} />);
    expect(document.querySelector(".error-aggregation-panel")).toBeDefined();
  });

  it("renders resource bar chart when completed tools exist", () => {
    const tools = [
      makeTool({ toolId: "1", status: "success", durationMs: 1000 }),
    ];
    render(<ToolGrid {...defaultProps} tools={tools} />);
    expect(document.querySelector(".resource-bar-chart")).toBeDefined();
  });

  it("does not render resource bar chart when no completed tools", () => {
    const tools = [makeTool({ toolId: "1", status: "pending" })];
    render(<ToolGrid {...defaultProps} tools={tools} />);
    expect(document.querySelector(".resource-bar-chart")).toBeNull();
  });

  it("renders view toggle", () => {
    render(<ToolGrid {...defaultProps} tools={[makeTool()]} />);
    expect(screen.getByText("Grid")).toBeDefined();
    expect(screen.getByText("List")).toBeDefined();
  });

  it("calls onSetView when view toggled", () => {
    const onSetView = vi.fn();
    render(<ToolGrid {...defaultProps} tools={[makeTool()]} onSetView={onSetView} />);
    fireEvent.click(screen.getByText("List"));
    expect(onSetView).toHaveBeenCalledWith("list");
  });

  it("renders bulk action bar", () => {
    render(<ToolGrid {...defaultProps} tools={[makeTool()]} runningCount={2} completedCount={1} />);
    expect(screen.getByText("Cancel All (2)")).toBeDefined();
  });

  it("renders sort filter controls", () => {
    render(<ToolGrid {...defaultProps} tools={[makeTool()]} />);
    expect(document.querySelector(".sort-filter-controls")).toBeDefined();
  });

  it("calls onFilterBy when filter clicked", () => {
    const onFilterBy = vi.fn();
    render(<ToolGrid {...defaultProps} tools={[makeTool()]} onFilterBy={onFilterBy} />);
    fireEvent.click(screen.getByText("Running"));
    expect(onFilterBy).toHaveBeenCalledWith("running");
  });

  it("applies grid-cols class based on columns calculation", () => {
    const tools = [makeTool({ toolId: "1" }), makeTool({ toolId: "2" })];
    render(<ToolGrid {...defaultProps} tools={tools} containerWidth={1200} />);
    const grid = document.querySelector(".tool-grid");
    expect(grid?.className).toContain("grid-cols-");
  });
});
