import { describe, expect, it } from "vitest";
import { renderDiffNavigationControls } from "../../../../packages/web/src/components/chat/diff/DiffNavigationControls";
import { renderDiffViewModeToggle } from "../../../../packages/web/src/components/chat/diff/DiffViewModeToggle";
import { renderDiffStatistics } from "../../../../packages/web/src/components/chat/diff/DiffStatistics";
import { renderDiffGutterIndicators } from "../../../../packages/web/src/components/chat/diff/DiffGutterIndicators";
import type { DiffHunk, DiffStatistics as DiffStats } from "../../../../packages/web/src/types/diff";

describe("renderDiffNavigationControls", () => {
  it("shows correct position when at start", () => {
    const html = renderDiffNavigationControls(0, 8);
    expect(html).toContain("1 / 8");
    expect(html).toContain("disabled"); // prev button
  });

  it("shows both buttons enabled when in middle", () => {
    const html = renderDiffNavigationControls(3, 8);
    expect(html).toContain("4 / 8");
    // Both buttons should not be disabled
    expect(html).not.toContain('data-action="prev-hunk" disabled');
    expect(html).not.toContain('data-action="next-hunk" disabled');
  });

  it("disables next button at last hunk", () => {
    const html = renderDiffNavigationControls(7, 8);
    expect(html).toContain("8 / 8");
  });

  it("shows 0/0 for empty diff", () => {
    const html = renderDiffNavigationControls(0, 0);
    expect(html).toContain("0 / 0");
  });
});

describe("renderDiffViewModeToggle", () => {
  it("highlights unified when active", () => {
    const html = renderDiffViewModeToggle("unified");
    expect(html).toContain("bg-emerald-950/30");
    expect(html).toContain("Unified");
  });

  it("highlights split when active", () => {
    const html = renderDiffViewModeToggle("split");
    expect(html).toContain("Split");
  });

  it("has correct data attributes for interactivity", () => {
    const html = renderDiffViewModeToggle("unified");
    expect(html).toContain('data-action="set-view-mode"');
    expect(html).toContain('data-mode="unified"');
    expect(html).toContain('data-mode="split"');
  });
});

describe("renderDiffStatistics", () => {
  it("renders all stat items", () => {
    const stats: DiffStats = {
      linesAdded: 15,
      linesDeleted: 7,
      linesModified: 3,
      changeBlocks: 4,
      totalLines: 200,
    };
    const html = renderDiffStatistics(stats);
    expect(html).toContain("+15");
    expect(html).toContain("-7");
    expect(html).toContain("*3");
    expect(html).toContain("200 lines");
  });
});

describe("renderDiffGutterIndicators", () => {
  it("returns empty for empty hunks", () => {
    const html = renderDiffGutterIndicators([], 0);
    expect(html).toBe("");
  });

  it("renders markers for hunk positions", () => {
    const hunks: DiffHunk[] = [
      {
        hunkIndex: 0,
        oldStart: 50,
        oldLines: 3,
        newStart: 50,
        newLines: 4,
        lines: [
          { type: "delete", oldLineNumber: 50, newLineNumber: null, content: "-", charChanges: [] },
          { type: "add", oldLineNumber: null, newLineNumber: 50, content: "+", charChanges: [] },
        ],
        isCollapsed: false,
        isContextHunk: false,
      },
    ];
    const html = renderDiffGutterIndicators(hunks, 100);
    expect(html).toContain("diff-gutter-marker");
  });
});
