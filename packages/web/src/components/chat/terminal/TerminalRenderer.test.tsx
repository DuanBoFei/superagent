import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TerminalRenderer, TerminalFromLines } from "./TerminalRenderer";
import { createDefaultAttributes } from "../../../lib/ansi-parser/sgr";
import type { TerminalLine } from "../../../types/terminal";

function makeLine(chars: string): TerminalLine {
  const attrs = createDefaultAttributes();
  return {
    cells: chars.split("").map((char) => ({ char, attributes: attrs, width: 1 as const })),
    isWrapped: false,
    timestamp: Date.now(),
  };
}

describe("TerminalRenderer", () => {
  it("renders empty pre when content is empty", () => {
    const { container } = render(<TerminalRenderer content="" />);
    expect(container.querySelector("[data-terminal-empty]")).toBeDefined();
  });

  it("renders terminal output with ANSI content", () => {
    const { container } = render(<TerminalRenderer content="hello world" />);
    const pre = container.querySelector(".terminal-renderer");
    expect(pre).toBeDefined();
    expect(pre?.getAttribute("role")).toBe("log");
  });

  it("renders copy button", () => {
    render(<TerminalRenderer content="test" />);
    expect(screen.getByText("Copy")).toBeDefined();
  });

  it("calls onCopy when copy clicked", () => {
    const onCopy = vi.fn();
    render(<TerminalRenderer content="copy me" onCopy={onCopy} />);
    fireEvent.click(screen.getByText("Copy"));
    expect(onCopy).toHaveBeenCalledWith("copy me");
  });

  it("shows truncated notice when lines exceed maxLines", () => {
    const content = Array.from({ length: 15 }, (_, i) => `line ${i}`).join("\n");
    render(<TerminalRenderer content={content} maxLines={10} />);
    expect(screen.getByText(/Showing 10 of 15 lines/)).toBeDefined();
  });

  it("calls onShowAll when show all clicked", () => {
    const content = Array.from({ length: 15 }, (_, i) => `line ${i}`).join("\n");
    const onShowAll = vi.fn();
    render(<TerminalRenderer content={content} maxLines={10} onShowAll={onShowAll} />);
    fireEvent.click(screen.getByText("Show all"));
    expect(onShowAll).toHaveBeenCalledOnce();
  });

  it("does not show truncated notice when within limit", () => {
    const content = "line 1\nline 2";
    render(<TerminalRenderer content={content} maxLines={10} />);
    expect(screen.queryByText(/Showing/)).toBeNull();
  });

  it("renders with font settings", () => {
    const { container } = render(<TerminalRenderer content="test" fontSize={14} lineHeight={1.5} />);
    const pre = container.querySelector(".terminal-renderer") as HTMLElement;
    expect(pre?.style.fontSize).toBe("14px");
    expect(pre?.style.lineHeight).toBe("1.5");
  });
});

describe("TerminalFromLines", () => {
  it("renders empty state for empty lines", () => {
    const { container } = render(<TerminalFromLines lines={[]} />);
    expect(container.querySelector("[data-terminal-empty]")).toBeDefined();
  });

  it("renders lines from TerminalLine array", () => {
    const lines = [makeLine("hello"), makeLine("world")];
    const { container } = render(<TerminalFromLines lines={lines} />);
    expect(container.querySelectorAll(".terminal-line").length).toBe(2);
  });

  it("shows truncated notice when lines exceed maxLines", () => {
    const lines = Array.from({ length: 15 }, () => makeLine("x"));
    const { container } = render(<TerminalFromLines lines={lines} maxLines={5} />);
    expect(screen.getByText(/\+10 earlier lines/)).toBeDefined();
    expect(container.querySelectorAll(".terminal-line").length).toBe(5);
  });

  it("renders cursor when visible", () => {
    const lines = [makeLine("hello"), makeLine("world")];
    const { container } = render(
      <TerminalFromLines lines={lines} cursorX={2} cursorY={1} cursorVisible={true} />,
    );
    expect(container.querySelector(".terminal-cursor")).toBeDefined();
  });

  it("hides cursor when not visible", () => {
    const lines = [makeLine("hello")];
    const { container } = render(
      <TerminalFromLines lines={lines} cursorX={2} cursorY={0} cursorVisible={false} />,
    );
    expect(container.querySelector(".terminal-cursor")).toBeNull();
  });
});
