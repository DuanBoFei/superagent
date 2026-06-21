import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TerminalViewport } from "./TerminalViewport";
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

describe("TerminalViewport", () => {
  it("renders empty viewport when no lines", () => {
    const { container } = render(
      <TerminalViewport lines={[]} viewportHeight={400} scrollTop={0} />,
    );
    const viewport = container.querySelector(".terminal-viewport");
    expect(viewport).toBeDefined();
    expect(viewport?.getAttribute("role")).toBe("log");
  });

  it("renders with correct height", () => {
    const { container } = render(
      <TerminalViewport lines={[makeLine("test")]} viewportHeight={400} scrollTop={0} />,
    );
    const viewport = container.querySelector(".terminal-viewport") as HTMLElement;
    expect(viewport?.style.height).toBe("400px");
  });

  it("renders visible lines", () => {
    const lines = [makeLine("a"), makeLine("b")];
    const { container } = render(
      <TerminalViewport lines={lines} viewportHeight={400} scrollTop={0} virtualScrollThreshold={999} />,
    );
    expect(container.querySelectorAll(".terminal-line").length).toBe(2);
  });

  it("enables virtual scroll when lines exceed threshold", () => {
    const lines = Array.from({ length: 10 }, () => makeLine("x"));
    const { container } = render(
      <TerminalViewport lines={lines} viewportHeight={200} scrollTop={0} virtualScrollThreshold={5} />,
    );
    const viewport = container.querySelector(".terminal-viewport") as HTMLElement;
    expect(viewport?.getAttribute("data-virtual-scroll")).toBe("true");
  });

  it("has terminal-viewport class", () => {
    const { container } = render(
      <TerminalViewport lines={[makeLine("x")]} viewportHeight={200} scrollTop={0} />,
    );
    expect(container.querySelector(".terminal-viewport")).toBeDefined();
  });

  it("renders cursor overlay inside content", () => {
    const lines = [makeLine("hello")];
    const { container } = render(
      <TerminalViewport lines={lines} viewportHeight={200} scrollTop={0} cursorX={1} cursorY={0} cursorStyle="block" />,
    );
    expect(container.querySelector(".terminal-cursor")).toBeDefined();
  });
});
