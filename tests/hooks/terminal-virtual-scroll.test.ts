import { describe, expect, it } from "vitest";
import { useTerminalVirtualScroll, isNearBottom, getVisibleLineRange } from "../../packages/web/src/hooks/use-terminal-virtual-scroll";

describe("useTerminalVirtualScroll", () => {
  it("disables virtualization below threshold", () => {
    const result = useTerminalVirtualScroll({
      totalLines: 100,
      viewportHeight: 600,
      scrollTop: 0,
      threshold: 500,
    });
    expect(result.enabled).toBe(false);
    expect(result.window.items).toHaveLength(100);
  });

  it("enables virtualization at or above threshold", () => {
    const result = useTerminalVirtualScroll({
      totalLines: 600,
      viewportHeight: 600,
      scrollTop: 0,
      threshold: 500,
    });
    expect(result.enabled).toBe(true);
    expect(result.window.items.length).toBeLessThan(600);
  });

  it("renders only visible + overscan lines when virtualized", () => {
    const result = useTerminalVirtualScroll({
      totalLines: 10000,
      fontSize: 13,
      lineHeight: 1.2,
      viewportHeight: 600,
      scrollTop: 0,
      overscan: 2,
    });
    expect(result.enabled).toBe(true);
    // itemHeight ≈ 15.6, visibleCount ≈ 38, + 4 overscan ≈ 42
    expect(result.window.items.length).toBeLessThan(100);
  });

  it("computes correct totalHeight", () => {
    const result = useTerminalVirtualScroll({
      totalLines: 2000,
      fontSize: 13,
      lineHeight: 1.2,
      viewportHeight: 600,
      scrollTop: 0,
    });
    expect(result.window.totalHeight).toBe(2000 * Math.round(13 * 1.2));
  });

  it("reports autoScroll when at bottom", () => {
    // itemHeight = 16 (13*1.2 rounded), totalHeight = 1000*16 = 16000
    // scrollTop=15500 + viewport(600) = 16100 >= 16000 - 50 = 15950
    const result = useTerminalVirtualScroll({
      totalLines: 1000,
      fontSize: 13,
      lineHeight: 1.2,
      viewportHeight: 600,
      scrollTop: 15500,
    });
    expect(result.shouldAutoScroll).toBe(true);
  });

  it("uses default threshold of 500", () => {
    const result = useTerminalVirtualScroll({
      totalLines: 499,
      viewportHeight: 600,
      scrollTop: 0,
    });
    expect(result.enabled).toBe(false);
  });
});

describe("isNearBottom", () => {
  it("returns true when within threshold", () => {
    expect(isNearBottom(950, 100, 1000)).toBe(true);
  });

  it("returns false when far from bottom", () => {
    expect(isNearBottom(100, 100, 1000)).toBe(false);
  });
});

describe("getVisibleLineRange", () => {
  it("returns visible range with overscan", () => {
    const range = getVisibleLineRange(500, 100, 200, 20, 2);
    // visibleStart = floor(100/20) = 5
    // visibleCount = ceil(200/20) = 10
    // start = max(0, 5-2) = 3
    // end = min(500, 5+10+2) = 17
    expect(range.start).toBe(3);
    expect(range.end).toBe(17);
  });

  it("clamps start to 0", () => {
    const range = getVisibleLineRange(100, 0, 200, 20, 2);
    expect(range.start).toBe(0);
  });
});
