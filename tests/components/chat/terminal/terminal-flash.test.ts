import { describe, expect, it, beforeEach } from "vitest";
import { renderTerminalFlash, renderBellStyles, resetBellCooldown } from "../../../../packages/web/src/components/chat/terminal/TerminalFlash";

describe("renderTerminalFlash", () => {
  beforeEach(() => {
    resetBellCooldown();
  });
  it("renders a flash indicator span", () => {
    const html = renderTerminalFlash();
    expect(html).toContain("terminal-bell-flash");
    expect(html).toContain('aria-label="bell"');
  });

  it("returns empty string when cooldown is active", () => {
    // First call
    const first = renderTerminalFlash();
    expect(first).not.toBe("");

    // Second call within cooldown (1s) should be empty
    const second = renderTerminalFlash();
    expect(second).toBe("");
  });
});

describe("renderBellStyles", () => {
  it("renders CSS for bell flash animation", () => {
    const css = renderBellStyles();
    expect(css).toContain("terminal-bell-flash");
    expect(css).toContain("keyframes");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("wraps in style tag", () => {
    const css = renderBellStyles();
    expect(css).toContain("<style>");
    expect(css).toContain("</style>");
  });
});
