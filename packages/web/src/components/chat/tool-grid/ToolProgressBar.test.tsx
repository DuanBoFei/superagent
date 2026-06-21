import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ToolProgressBar } from "./ToolProgressBar";

describe("ToolProgressBar", () => {
  it("renders determinate progress bar", () => {
    render(<ToolProgressBar progress={60} status="running" />);
    const track = document.querySelector("[role='progressbar']");
    expect(track).toBeDefined();
    expect(track?.getAttribute("aria-valuenow")).toBe("60");
  });

  it("renders indeterminate progress bar", () => {
    render(<ToolProgressBar progress={null} status="running" />);
    const track = document.querySelector("[role='progressbar']");
    expect(track).toBeDefined();
    expect(track?.getAttribute("aria-valuenow")).toBeNull();
    expect(track?.className).toContain("tool-progress-running");
  });

  it("sets fill width for determinate", () => {
    render(<ToolProgressBar progress={75} status="success" />);
    const fill = document.querySelector(".tool-progress-fill");
    expect(fill?.getAttribute("style")).toContain("width: 75%");
  });

  it("clamps progress to 0-100", () => {
    render(<ToolProgressBar progress={150} status="running" />);
    const fill = document.querySelector(".tool-progress-fill");
    expect(fill?.getAttribute("style")).toContain("width: 100%");
  });

  it("applies status-specific class", () => {
    render(<ToolProgressBar progress={50} status="failed" />);
    const track = document.querySelector("[role='progressbar']");
    expect(track?.className).toContain("tool-progress-failed");
  });

  it("applies indeterminate class when progress is null", () => {
    render(<ToolProgressBar progress={null} status="pending" />);
    const fill = document.querySelector(".tool-progress-fill");
    expect(fill?.className).toContain("tool-progress-indeterminate");
  });
});
