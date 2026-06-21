import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorAggregationPanel } from "./ErrorAggregationPanel";
import type { ToolCardData } from "../../../types/tool-grid";

function makeFailedTool(overrides?: Partial<ToolCardData>): ToolCardData {
  return {
    toolId: "tool-1",
    toolName: "bash",
    parameters: {},
    status: "failed",
    progress: null,
    startTime: Date.now(),
    endTime: Date.now(),
    durationMs: 1000,
    outputPreview: [],
    fullOutput: "",
    error: { message: "Command failed" },
    isExpanded: false,
    resourceUsage: { outputBytes: 0 },
    ...overrides,
  };
}

describe("ErrorAggregationPanel", () => {
  it("returns null when no failed tools", () => {
    const { container } = render(
      <ErrorAggregationPanel
        failedTools={[]}
        isExpanded={false}
        onTogglePanel={vi.fn()}
        onScrollToTool={vi.fn()}
      />,
    );
    expect(container.querySelector(".error-aggregation-panel")).toBeNull();
  });

  it("renders error count badge", () => {
    render(
      <ErrorAggregationPanel
        failedTools={[makeFailedTool(), makeFailedTool({ toolId: "tool-2", toolName: "read" })]}
        isExpanded={false}
        onTogglePanel={vi.fn()}
        onScrollToTool={vi.fn()}
      />,
    );
    expect(screen.getByText("2 errors")).toBeDefined();
  });

  it("renders single error label", () => {
    render(
      <ErrorAggregationPanel
        failedTools={[makeFailedTool()]}
        isExpanded={false}
        onTogglePanel={vi.fn()}
        onScrollToTool={vi.fn()}
      />,
    );
    expect(screen.getByText("1 error")).toBeDefined();
  });

  it("shows error list when expanded", () => {
    render(
      <ErrorAggregationPanel
        failedTools={[makeFailedTool()]}
        isExpanded={true}
        onTogglePanel={vi.fn()}
        onScrollToTool={vi.fn()}
      />,
    );
    expect(screen.getByText("Command failed")).toBeDefined();
  });

  it("hides error list when collapsed", () => {
    render(
      <ErrorAggregationPanel
        failedTools={[makeFailedTool()]}
        isExpanded={false}
        onTogglePanel={vi.fn()}
        onScrollToTool={vi.fn()}
      />,
    );
    expect(screen.queryByText("Command failed")).toBeNull();
  });

  it("calls onTogglePanel when toggle clicked", () => {
    const onTogglePanel = vi.fn();
    render(
      <ErrorAggregationPanel
        failedTools={[makeFailedTool()]}
        isExpanded={false}
        onTogglePanel={onTogglePanel}
        onScrollToTool={vi.fn()}
      />,
    );
    fireEvent.click(document.querySelector(".error-panel-toggle") as HTMLButtonElement);
    expect(onTogglePanel).toHaveBeenCalledOnce();
  });

  it("calls onScrollToTool when error item clicked", () => {
    const onScrollToTool = vi.fn();
    render(
      <ErrorAggregationPanel
        failedTools={[makeFailedTool()]}
        isExpanded={true}
        onTogglePanel={vi.fn()}
        onScrollToTool={onScrollToTool}
      />,
    );
    fireEvent.click(document.querySelector(".error-item-btn") as HTMLButtonElement);
    expect(onScrollToTool).toHaveBeenCalledWith("tool-1", "bash");
  });
});
