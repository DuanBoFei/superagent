import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TerminalCursor } from "./TerminalCursor";

describe("TerminalCursor", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(<TerminalCursor pos={{ x: 0, y: 0 }} visible={false} />);
    expect(container.querySelector(".terminal-cursor")).toBeNull();
  });

  it("renders nothing when x < 0", () => {
    const { container } = render(<TerminalCursor pos={{ x: -1, y: 0 }} />);
    expect(container.querySelector(".terminal-cursor")).toBeNull();
  });

  it("renders block cursor by default", () => {
    const { container } = render(<TerminalCursor pos={{ x: 5, y: 2 }} />);
    const el = container.querySelector(".terminal-cursor");
    expect(el).toBeDefined();
    expect(el?.className).toContain("terminal-cursor--block");
  });

  it("renders underline style", () => {
    const { container } = render(<TerminalCursor pos={{ x: 0, y: 0 }} style="underline" />);
    expect(container.querySelector(".terminal-cursor--underline")).toBeDefined();
  });

  it("renders bar style", () => {
    const { container } = render(<TerminalCursor pos={{ x: 0, y: 0 }} style="bar" />);
    expect(container.querySelector(".terminal-cursor--bar")).toBeDefined();
  });

  it("sets data-cursor-x and data-cursor-y", () => {
    const { container } = render(<TerminalCursor pos={{ x: 3, y: 7 }} />);
    const el = container.querySelector(".terminal-cursor") as HTMLElement;
    expect(el?.getAttribute("data-cursor-x")).toBe("3");
    expect(el?.getAttribute("data-cursor-y")).toBe("7");
  });

  it("enables blink animation", () => {
    const { container } = render(<TerminalCursor pos={{ x: 0, y: 0 }} enableBlink={true} />);
    const el = container.querySelector(".terminal-cursor") as HTMLElement;
    expect(el?.style.animation).toContain("cursor-blink");
  });
});
