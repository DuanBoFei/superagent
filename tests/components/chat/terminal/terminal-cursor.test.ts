import { describe, expect, it } from "vitest";
import { renderTerminalCursor } from "../../../../packages/web/src/components/chat/terminal/TerminalCursor";

describe("renderTerminalCursor", () => {
  it("renders block cursor by default", () => {
    const html = renderTerminalCursor({ x: 5, y: 2 });
    expect(html).toContain("terminal-cursor");
    expect(html).toContain("terminal-cursor--block");
  });

  it("renders underline cursor style", () => {
    const html = renderTerminalCursor({ x: 0, y: 0 }, { style: "underline" });
    expect(html).toContain("terminal-cursor--underline");
  });

  it("renders bar cursor style", () => {
    const html = renderTerminalCursor({ x: 10, y: 3 }, { style: "bar" });
    expect(html).toContain("terminal-cursor--bar");
  });

  it("returns empty string when hidden", () => {
    const html = renderTerminalCursor({ x: 3, y: 1 }, { visible: false });
    expect(html).toBe("");
  });

  it("returns empty string when position is negative", () => {
    const html = renderTerminalCursor({ x: -1, y: -1 });
    expect(html).toBe("");
  });

  it("adds blink animation when enableBlink is true", () => {
    const html = renderTerminalCursor({ x: 0, y: 0 }, { enableBlink: true });
    expect(html).toContain("animation");
  });

  it("does not blink by default", () => {
    const html = renderTerminalCursor({ x: 0, y: 0 });
    expect(html).not.toContain("animation");
  });

  it("includes data attributes for positioning", () => {
    const html = renderTerminalCursor({ x: 7, y: 3 });
    expect(html).toContain('data-cursor-x="7"');
    expect(html).toContain('data-cursor-y="3"');
  });

  it("renders with default visible=true when not specified", () => {
    const html = renderTerminalCursor({ x: 1, y: 1 });
    expect(html).not.toBe("");
    expect(html).toContain("terminal-cursor");
  });
});
