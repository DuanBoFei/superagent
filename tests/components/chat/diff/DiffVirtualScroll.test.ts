import { describe, expect, it } from "vitest";
import { computeDiffVirtualScroll } from "../../../../packages/web/src/components/chat/diff/DiffVirtualScroll";
import { scrollToHunk, renderExpandAllButton } from "../../../../packages/web/src/hooks/use-diff-virtual-scroll";
import type { DiffHunk } from "../../../../packages/web/src/types/diff";

function makeLargeHunks(count: number, linesPerHunk: number): DiffHunk[] {
  return Array.from({ length: count }, (_, hi) => ({
    hunkIndex: hi,
    oldStart: hi * linesPerHunk + 1,
    oldLines: linesPerHunk,
    newStart: hi * linesPerHunk + 1,
    newLines: linesPerHunk,
    lines: Array.from({ length: linesPerHunk }, (_, li) => ({
      type: "context" as const,
      oldLineNumber: hi * linesPerHunk + li + 1,
      newLineNumber: hi * linesPerHunk + li + 1,
      content: `line ${hi * linesPerHunk + li + 1}`,
      charChanges: [],
    })),
    isCollapsed: false,
    isContextHunk: false,
  }));
}

describe("computeDiffVirtualScroll", () => {
  it("disables virtual scroll for small diffs (<= 500 lines)", () => {
    const hunks = makeLargeHunks(1, 100);
    const result = computeDiffVirtualScroll(hunks, {
      hunks,
      lineHeight: 20,
      viewportHeight: 600,
      scrollTop: 0,
    });
    expect(result.enabled).toBe(false);
    expect(result.visibleHunks).toEqual(hunks);
  });

  it("enables virtual scroll for large diffs (> 500 lines)", () => {
    const hunks = makeLargeHunks(10, 100);
    const result = computeDiffVirtualScroll(hunks, {
      hunks,
      lineHeight: 20,
      viewportHeight: 600,
      scrollTop: 0,
    });
    expect(result.enabled).toBe(true);
    expect(result.totalHeight).toBe(1000 * 20);
    expect(result.visibleHunks.length).toBeLessThan(hunks.length);
    expect(result.topPadding).toBe(0);
  });

  it("adjusts visible range based on scroll position", () => {
    const hunks = makeLargeHunks(10, 100);
    const result = computeDiffVirtualScroll(hunks, {
      hunks,
      lineHeight: 20,
      viewportHeight: 600,
      scrollTop: 5000,
    });
    expect(result.enabled).toBe(true);
    // At scrollTop 5000 with lineHeight 20, we should be past line 250
    expect(result.startIndex).toBeGreaterThan(200);
  });
});

describe("scrollToHunk", () => {
  it("returns 0 for first hunk", () => {
    const hunks = makeLargeHunks(5, 50);
    const scrollTop = scrollToHunk(hunks, new Set(), 0, 20);
    expect(scrollTop).toBe(0);
  });

  it("calculates correct scroll position for later hunks", () => {
    const hunks = makeLargeHunks(5, 50);
    const scrollTop = scrollToHunk(hunks, new Set(), 3, 20);
    expect(scrollTop).toBe(3 * 50 * 20);
  });

  it("accounts for collapsed hunks in scroll calculation", () => {
    const hunks = makeLargeHunks(5, 50);
    const collapsed = new Set([1]);
    const scrollTop = scrollToHunk(hunks, collapsed, 3, 20);
    // Hunk 0: 50*20, Hunk 1: 1*20 (collapsed), Hunk 2: 50*20 = 2020
    expect(scrollTop).toBe(50 * 20 + 20 + 50 * 20);
  });
});

describe("renderExpandAllButton", () => {
  it("returns empty for zero context hunks", () => {
    expect(renderExpandAllButton(0)).toBe("");
  });

  it("renders button with correct count", () => {
    const html = renderExpandAllButton(3);
    expect(html).toContain("Expand all");
    expect(html).toContain("3");
    expect(html).toContain("sections");
  });

  it("uses singular for single section", () => {
    const html = renderExpandAllButton(1);
    expect(html).toContain("section");
  });
});
