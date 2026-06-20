import { describe, expect, it } from "vitest";
import { renderDiffSplitView } from "../../../../packages/web/src/components/chat/diff/DiffSplitView";
import type { DiffHunk } from "../../../../packages/web/src/types/diff";

function makeHunks(): DiffHunk[] {
  return [
    {
      hunkIndex: 0,
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 4,
      lines: [
        { type: "context", oldLineNumber: 1, newLineNumber: 1, content: "// header", charChanges: [] },
        { type: "delete", oldLineNumber: 2, newLineNumber: null, content: "old line", charChanges: [] },
        { type: "add", oldLineNumber: null, newLineNumber: 2, content: "new line", charChanges: [] },
        { type: "context", oldLineNumber: 3, newLineNumber: 3, content: "// footer", charChanges: [] },
      ],
      isCollapsed: false,
      isContextHunk: false,
    },
  ];
}

describe("renderDiffSplitView", () => {
  it("renders empty state for no hunks", () => {
    const html = renderDiffSplitView([], new Set());
    expect(html).toContain("No changes");
  });

  it("renders split layout with left and right columns", () => {
    const html = renderDiffSplitView(makeHunks(), new Set());
    expect(html).toContain("diff-split-left");
    expect(html).toContain("diff-split-right");
    expect(html).toContain("grid-cols-2");
  });

  it("renders delete line on left and empty placeholder on right", () => {
    const html = renderDiffSplitView(makeHunks(), new Set());
    // Delete line should be visible on the left side
    expect(html).toContain("old line");
  });

  it("renders add line on right with empty placeholder on left", () => {
    const html = renderDiffSplitView(makeHunks(), new Set());
    // Add line should be visible on the right side
    expect(html).toContain("new line");
  });

  it("renders context lines on both sides", () => {
    const html = renderDiffSplitView(makeHunks(), new Set());
    const headerCount = (html.match(/\/\/ header/g) || []).length;
    expect(headerCount).toBeGreaterThanOrEqual(1);
  });

  it("collapses hunk when in collapsed set", () => {
    const html = renderDiffSplitView(makeHunks(), new Set([0]));
    expect(html).toContain("lines hidden");
  });
});
