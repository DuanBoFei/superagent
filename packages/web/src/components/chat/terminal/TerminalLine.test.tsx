import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TerminalLine } from "./TerminalLine";
import { createDefaultAttributes } from "../../../lib/ansi-parser/sgr";
import type { TerminalLine as TerminalLineType } from "../../../types/terminal";

function makeLine(chars: string): TerminalLineType {
  const attrs = createDefaultAttributes();
  return {
    cells: chars.split("").map((char) => ({ char, attributes: attrs, width: 1 as const })),
    isWrapped: false,
    timestamp: Date.now(),
  };
}

describe("TerminalLine", () => {
  it("renders nothing for empty cells", () => {
    const { container } = render(<TerminalLine line={{ cells: [], isWrapped: false, timestamp: 0 }} />);
    expect(container.querySelector(".terminal-line")).toBeNull();
  });

  it("renders plain text for default attributes", () => {
    const line = makeLine("hello");
    const { container } = render(<TerminalLine line={line} />);
    const el = container.querySelector(".terminal-line");
    expect(el).toBeDefined();
    expect(el?.textContent).toBe("hello");
  });

  it("renders with monospace font family", () => {
    const line = makeLine("test");
    const { container } = render(<TerminalLine line={line} />);
    const el = container.querySelector(".terminal-line") as HTMLElement;
    expect(el?.style.fontFamily).toBeDefined();
  });

  it("renders HTML-escaped content", () => {
    const line = makeLine("<script>");
    const { container } = render(<TerminalLine line={line} />);
    const el = container.querySelector(".terminal-line");
    expect(el?.innerHTML).toContain("&lt;script&gt;");
  });
});
