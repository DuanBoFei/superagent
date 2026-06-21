import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResourceBarChart } from "./ResourceBarChart";
import type { ToolCardData } from "../../../types/tool-grid";

function makeTool(overrides?: Partial<ToolCardData>): ToolCardData {
  return {
    toolId: "tool-1",
    toolName: "bash",
    parameters: {},
    status: "success",
    progress: null,
    startTime: Date.now(),
    endTime: Date.now(),
    durationMs: 5000,
    outputPreview: [],
    fullOutput: "",
    error: null,
    isExpanded: false,
    resourceUsage: { outputBytes: 1024 },
    ...overrides,
  };
}

describe("ResourceBarChart", () => {
  it("renders metric tabs", () => {
    render(
      <ResourceBarChart tools={[makeTool()]} selectedMetric="duration" onSelectMetric={vi.fn()} />,
    );
    expect(screen.getByText("Duration")).toBeDefined();
    expect(screen.getByText("Output Size")).toBeDefined();
  });

  it("shows no completed tools when all tools are running", () => {
    render(
      <ResourceBarChart
        tools={[makeTool({ status: "running" })]}
        selectedMetric="duration"
        onSelectMetric={vi.fn()}
      />,
    );
    expect(screen.getByText("No completed tools")).toBeDefined();
  });

  it("renders tool bars for completed tools", () => {
    render(
      <ResourceBarChart
        tools={[
          makeTool({ toolId: "1", toolName: "read", durationMs: 3000 }),
          makeTool({ toolId: "2", toolName: "grep", durationMs: 1000 }),
        ]}
        selectedMetric="duration"
        onSelectMetric={vi.fn()}
      />,
    );
    const rows = document.querySelectorAll(".tool-chart-row");
    expect(rows.length).toBe(2);
  });

  it("marks active metric tab as selected", () => {
    const { container } = render(
      <ResourceBarChart tools={[makeTool()]} selectedMetric="duration" onSelectMetric={vi.fn()} />,
    );
    const durationTab = container.querySelector(".metric-active-duration");
    expect(durationTab).toBeDefined();
  });

  it("calls onSelectMetric when tab clicked", () => {
    const onSelectMetric = vi.fn();
    render(
      <ResourceBarChart tools={[makeTool()]} selectedMetric="duration" onSelectMetric={onSelectMetric} />,
    );
    fireEvent.click(screen.getByText("Output Size"));
    expect(onSelectMetric).toHaveBeenCalledWith("outputSize");
  });

  it("renders outputSize metric with formatted bytes", () => {
    render(
      <ResourceBarChart
        tools={[makeTool({ resourceUsage: { outputBytes: 2048 } })]}
        selectedMetric="outputSize"
        onSelectMetric={vi.fn()}
      />,
    );
    expect(screen.getByText("2.0KB")).toBeDefined();
  });

  it("filters out pending tools", () => {
    render(
      <ResourceBarChart
        tools={[
          makeTool({ toolId: "1", status: "pending" }),
          makeTool({ toolId: "2", status: "success" }),
        ]}
        selectedMetric="duration"
        onSelectMetric={vi.fn()}
      />,
    );
    const rows = document.querySelectorAll(".tool-chart-row");
    expect(rows.length).toBe(1);
  });
});
