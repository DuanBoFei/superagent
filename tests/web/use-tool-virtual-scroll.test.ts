import { describe, expect, it } from "vitest";
import { useToolVirtualScroll } from "../../packages/web/src/hooks/use-tool-virtual-scroll";

const CARD_HEIGHT = 136;

// ── Enable Threshold ───────────────────────────────

describe("enable threshold", () => {
  it("disables virtual scroll when count is below threshold (default 20)", () => {
    const result = useToolVirtualScroll({ toolCount: 15, scrollTop: 0, viewportHeight: 800 });
    expect(result.enabled).toBe(false);
  });

  it("disables virtual scroll when count equals threshold", () => {
    const result = useToolVirtualScroll({ toolCount: 20, scrollTop: 0, viewportHeight: 800 });
    expect(result.enabled).toBe(false);
  });

  it("enables virtual scroll when count exceeds threshold", () => {
    const result = useToolVirtualScroll({ toolCount: 25, scrollTop: 0, viewportHeight: 800 });
    expect(result.enabled).toBe(true);
  });

  it("respects custom enable threshold", () => {
    const result = useToolVirtualScroll({ toolCount: 8, scrollTop: 0, viewportHeight: 800, enableThreshold: 5 });
    expect(result.enabled).toBe(true);
  });

  it("disables when below custom threshold", () => {
    const result = useToolVirtualScroll({ toolCount: 3, scrollTop: 0, viewportHeight: 800, enableThreshold: 5 });
    expect(result.enabled).toBe(false);
  });
});

// ── Window Computation ──────────────────────────────

describe("window computation", () => {
  it("returns null window when disabled", () => {
    const result = useToolVirtualScroll({ toolCount: 10, scrollTop: 0, viewportHeight: 800 });
    expect(result.window).toBeNull();
  });

  it("computes total height correctly", () => {
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: 0, viewportHeight: 800 });
    expect(result.window).not.toBeNull();
    expect(result.window!.totalHeight).toBe(30 * CARD_HEIGHT);
  });

  it("shows first visible items at scrollTop 0", () => {
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: 0, viewportHeight: 800 });
    expect(result.window).not.toBeNull();
    expect(result.window!.startIndex).toBe(0);
  });

  it("advances start index when scrolled down", () => {
    // 3 full cards scrolled past = 3 * 136 = 408
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: 408, viewportHeight: 800 });
    expect(result.window).not.toBeNull();
    expect(result.window!.startIndex).toBe(1); // index 3 minus overscan 2
  });

  it("clamps endIndex to item count", () => {
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: CARD_HEIGHT * 29, viewportHeight: 800 });
    expect(result.window).not.toBeNull();
    expect(result.window!.endIndex).toBe(30);
  });

  it("topPadding matches hidden items above viewport", () => {
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: 500, viewportHeight: 800 });
    expect(result.window).not.toBeNull();
    expect(result.window!.topPadding).toBe(result.window!.startIndex * CARD_HEIGHT);
  });

  it("bottomPadding matches hidden items below viewport", () => {
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: 0, viewportHeight: 800 });
    expect(result.window).not.toBeNull();
    expect(result.window!.bottomPadding).toBe(
      result.window!.totalHeight - result.window!.endIndex * CARD_HEIGHT
    );
  });
});

// ── Items ───────────────────────────────────────────

describe("virtual scroll items", () => {
  it("returns item objects with correct offsetTop", () => {
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: 0, viewportHeight: 800 });
    expect(result.window).not.toBeNull();
    for (const item of result.window!.items) {
      expect(item.offsetTop).toBe(item.index * CARD_HEIGHT);
      expect(item.height).toBe(CARD_HEIGHT);
    }
  });

  it("item count does not exceed expected visible + overscan range", () => {
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: 0, viewportHeight: 400 });
    expect(result.window).not.toBeNull();
    // viewport 400 / 136 ≈ 3 visible, + 4 overscan (2 each side) = ~7
    expect(result.window!.items.length).toBeGreaterThanOrEqual(3);
    expect(result.window!.items.length).toBeLessThanOrEqual(10);
  });
});

// ── Edge Cases ──────────────────────────────────────

describe("edge cases", () => {
  it("handles zero tool count", () => {
    const result = useToolVirtualScroll({ toolCount: 0, scrollTop: 0, viewportHeight: 800 });
    expect(result.enabled).toBe(false);
    expect(result.window).toBeNull();
  });

  it("handles negative scrollTop as 0", () => {
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: -100, viewportHeight: 800 });
    expect(result.window).not.toBeNull();
    expect(result.window!.startIndex).toBe(0);
  });

  it("handles scrollTop beyond list", () => {
    const totalH = 30 * CARD_HEIGHT;
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: totalH + 1000, viewportHeight: 800 });
    expect(result.window).not.toBeNull();
    expect(result.window!.startIndex).toBeGreaterThanOrEqual(0);
  });

  it("returns consistent padding sum", () => {
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: 1000, viewportHeight: 800 });
    expect(result.window).not.toBeNull();
    const { topPadding, bottomPadding, items, totalHeight } = result.window!;
    expect(topPadding + items.length * CARD_HEIGHT + bottomPadding).toBe(totalHeight);
  });

  it("handles small viewport", () => {
    const result = useToolVirtualScroll({ toolCount: 30, scrollTop: 0, viewportHeight: 100 });
    expect(result.window).not.toBeNull();
    expect(result.window!.items.length).toBeGreaterThan(0);
  });

  it("handles large tool count gracefully", () => {
    const result = useToolVirtualScroll({ toolCount: 500, scrollTop: 0, viewportHeight: 800 });
    expect(result.enabled).toBe(true);
    expect(result.window).not.toBeNull();
    expect(result.window!.totalHeight).toBe(500 * CARD_HEIGHT);
  });
});
