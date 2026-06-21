import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToolCard } from "./ToolCard";
import type { ToolCardData } from "../../../types/tool-grid";

function makeData(overrides?: Partial<ToolCardData>): ToolCardData {
  return {
    toolId: "tool-1",
    toolName: "read",
    parameters: { filePath: "src/app.ts" },
    status: "running",
    progress: 50,
    startTime: Date.now() - 5000,
    endTime: null,
    durationMs: null,
    outputPreview: ["line 1", "line 2"],
    fullOutput: "line 1\nline 2\nline 3",
    error: null,
    isExpanded: false,
    resourceUsage: { outputBytes: 0 },
    ...overrides,
  };
}

const defaultTimer = { formatted: "00:05", running: true, elapsedMs: 5000 };

describe("ToolCard", () => {
  it("renders tool label and name", () => {
    render(<ToolCard data={makeData()} timerState={defaultTimer} onToggle={vi.fn()} />);
    expect(screen.getByText("Read")).toBeDefined();
    expect(screen.getByText("read")).toBeDefined();
  });

  it("renders params section", () => {
    render(<ToolCard data={makeData({ parameters: { filePath: "src/app.ts", limit: 200 } })} timerState={defaultTimer} onToggle={vi.fn()} />);
    const params = document.querySelector(".tool-params");
    expect(params).toBeDefined();
    expect(params?.querySelectorAll(".tool-param").length).toBe(2);
  });

  it("renders no params section when empty", () => {
    render(<ToolCard data={makeData({ parameters: {} })} timerState={defaultTimer} onToggle={vi.fn()} />);
    expect(document.querySelector(".tool-params")).toBeNull();
  });

  it("renders output preview when collapsed", () => {
    render(<ToolCard data={makeData()} timerState={defaultTimer} onToggle={vi.fn()} />);
    const preview = document.querySelector(".tool-output-preview");
    expect(preview).toBeDefined();
    const lines = preview?.querySelectorAll(".tool-output-line");
    expect(lines?.length).toBe(2);
  });

  it("renders full output when expanded", () => {
    render(<ToolCard data={makeData({ isExpanded: true })} timerState={defaultTimer} onToggle={vi.fn()} />);
    const full = document.querySelector(".tool-output-full");
    expect(full).toBeDefined();
    const lines = full?.querySelectorAll(".tool-output-line");
    expect(lines?.length).toBe(3);
  });

  it("renders bash output as html when expanded with bashOutputHtml", () => {
    render(
      <ToolCard
        data={makeData({ toolName: "bash", isExpanded: true })}
        timerState={defaultTimer}
        bashOutputHtml="<span class='ansi-green'>PASS</span>"
        onToggle={vi.fn()}
      />,
    );
    const full = document.querySelector(".tool-output-full");
    expect(full?.querySelector(".ansi-green")).toBeDefined();
  });

  it("renders error section when error present", () => {
    render(
      <ToolCard
        data={makeData({ status: "failed", error: { message: "Command failed", stack: "at line 10" } })}
        timerState={{ formatted: "00:05", running: false, elapsedMs: 5000 }}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("Command failed")).toBeDefined();
    expect(document.querySelector(".tool-error-stack")).toBeDefined();
  });

  it("renders progress bar", () => {
    render(<ToolCard data={makeData({ progress: 75 })} timerState={defaultTimer} onToggle={vi.fn()} />);
    const progressbar = document.querySelector("[role='progressbar']");
    expect(progressbar).toBeDefined();
    expect(progressbar?.getAttribute("aria-valuenow")).toBe("75");
  });

  it("applies status class", () => {
    render(<ToolCard data={makeData({ status: "success" })} timerState={{ formatted: "00:00", running: false, elapsedMs: 0 }} onToggle={vi.fn()} />);
    const card = document.querySelector(".tool-card");
    expect(card?.className).toContain("card-status-success");
  });

  it("calls onToggle when toggle button clicked", () => {
    const onToggle = vi.fn();
    render(<ToolCard data={makeData()} timerState={defaultTimer} onToggle={onToggle} />);
    fireEvent.click(document.querySelector(".tool-card-toggle") as HTMLButtonElement);
    expect(onToggle).toHaveBeenCalledWith("tool-1");
  });

  it("shows collapse icon when expanded", () => {
    render(<ToolCard data={makeData({ isExpanded: true })} timerState={defaultTimer} onToggle={vi.fn()} />);
    expect(screen.getByText("▼")).toBeDefined();
  });

  it("shows expand icon when collapsed", () => {
    render(<ToolCard data={makeData({ isExpanded: false })} timerState={defaultTimer} onToggle={vi.fn()} />);
    expect(screen.getByText("▶")).toBeDefined();
  });

  it("has article role with aria-label", () => {
    render(<ToolCard data={makeData()} timerState={defaultTimer} onToggle={vi.fn()} />);
    const article = document.querySelector("[role='article']");
    expect(article).toBeDefined();
    expect(article?.getAttribute("aria-label")).toContain("Read");
    expect(article?.getAttribute("aria-label")).toContain("read");
  });
});
