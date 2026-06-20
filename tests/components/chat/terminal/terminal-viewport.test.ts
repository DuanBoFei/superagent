import { describe, expect, it } from "vitest";
import { renderTerminalViewport } from "../../../../packages/web/src/components/chat/terminal/TerminalViewport";
import type { TerminalLine } from "../../../../packages/web/src/types/terminal";
import { createDefaultAttributes } from "../../../../packages/web/src/lib/ansi-parser/sgr";

function cell(char: string) {
  return { char, attributes: createDefaultAttributes(), width: 1 as const };
}

function makeLines(count: number): TerminalLine[] {
  return Array.from({ length: count }, (_, i) => ({
    cells: [cell(`line${i}`)],
    isWrapped: false,
    timestamp: i,
  }));
}

describe("renderTerminalViewport", () => {
  it("renders terminal viewport container", () => {
    const html = renderTerminalViewport(makeLines(10), {
      viewportHeight: 600,
      scrollTop: 0,
    });
    expect(html).toContain("terminal-viewport");
    expect(html).toContain('role="log"');
  });

  it("renders all lines when below threshold", () => {
    const html = renderTerminalViewport(makeLines(10), {
      viewportHeight: 600,
      scrollTop: 0,
      virtualScrollThreshold: 500,
    });
    expect(html).toContain("line0");
    expect(html).toContain("line9");
    expect(html).toContain('data-virtual-scroll="false"');
  });

  it("renders only visible subset when above threshold", () => {
    const html = renderTerminalViewport(makeLines(1000), {
      viewportHeight: 600,
      scrollTop: 0,
      virtualScrollThreshold: 500,
    });
    expect(html).toContain("line0");
    // Should not render line 999 (far outside viewport)
    expect(html).not.toContain("line999");
    expect(html).toContain('data-virtual-scroll="true"');
  });

  it("handles empty lines array", () => {
    const html = renderTerminalViewport([], {
      viewportHeight: 600,
      scrollTop: 0,
    });
    expect(html).toContain("terminal-viewport");
  });

  it("renders cursor when within visible range", () => {
    const html = renderTerminalViewport(makeLines(10), {
      viewportHeight: 600,
      scrollTop: 0,
      cursorX: 2,
      cursorY: 5,
      cursorVisible: true,
    });
    expect(html).toContain("terminal-cursor");
  });

  it("uses virtual scroll top padding", () => {
    const html = renderTerminalViewport(makeLines(1000), {
      viewportHeight: 600,
      scrollTop: 5000,
      virtualScrollThreshold: 500,
    });
    // Should have padding at top for scrolled content
    expect(html).toContain("position:relative");
  });
});
