import { describe, expect, it } from "vitest";
import { createVirtualScroll } from "../../packages/web/src/hooks/use-virtual-scroll";

describe("virtual scroll", () => {
  it("renders only the visible window with overscan", () => {
    const window = createVirtualScroll({ itemCount: 500, itemHeight: 24, viewportHeight: 480, scrollTop: 0, overscan: 2 });

    expect(window.startIndex).toBe(0);
    expect(window.endIndex).toBe(22);
    expect(window.items).toHaveLength(22);
    expect(window.totalHeight).toBe(12_000);
  });

  it("calculates offsets for scrolled windows", () => {
    const window = createVirtualScroll({ itemCount: 500, itemHeight: 24, viewportHeight: 240, scrollTop: 240, overscan: 1 });

    expect(window.startIndex).toBe(9);
    expect(window.endIndex).toBe(21);
    expect(window.topPadding).toBe(216);
    expect(window.bottomPadding).toBe(11_496);
    expect(window.items[0]).toEqual({ index: 9, offsetTop: 216, height: 24 });
  });
});
