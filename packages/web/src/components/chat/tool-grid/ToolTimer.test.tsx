import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ToolTimer } from "./ToolTimer";

describe("ToolTimer", () => {
  it("renders formatted time", () => {
    render(<ToolTimer state={{ formatted: "01:23", running: false, elapsedMs: 83000 }} />);
    const timer = document.querySelector(".tool-timer-text");
    expect(timer?.textContent).toBe("01:23");
  });

  it("renders with running class when running", () => {
    render(<ToolTimer state={{ formatted: "00:05", running: true, elapsedMs: 5000 }} />);
    const timer = document.querySelector(".tool-timer");
    expect(timer?.className).toContain("tool-timer-running");
  });

  it("renders without running class when not running", () => {
    render(<ToolTimer state={{ formatted: "00:05", running: false, elapsedMs: 5000 }} />);
    const timer = document.querySelector(".tool-timer");
    expect(timer?.className).not.toContain("tool-timer-running");
  });

  it("has timer role", () => {
    render(<ToolTimer state={{ formatted: "00:00", running: false, elapsedMs: 0 }} />);
    const timer = document.querySelector("[role='timer']");
    expect(timer).toBeDefined();
  });

  it("has aria-label with elapsed time", () => {
    render(<ToolTimer state={{ formatted: "02:30", running: true, elapsedMs: 150000 }} />);
    const timer = document.querySelector("[role='timer']");
    expect(timer?.getAttribute("aria-label")).toBe("Elapsed time: 02:30");
  });
});
