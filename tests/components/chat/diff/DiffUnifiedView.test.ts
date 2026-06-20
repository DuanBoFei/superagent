import { describe, expect, it } from "vitest";
import { renderDiffUnifiedView } from "../../../../packages/web/src/components/chat/diff/DiffUnifiedView";
import type { DiffHunk } from "../../../../packages/web/src/types/diff";

function makeSampleHunks(): DiffHunk[] {
  return [
    {
      hunkIndex: 0,
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 4,
      lines: [
        { type: "context", oldLineNumber: 1, newLineNumber: 1, content: "import { foo } from './foo';", charChanges: [] },
        { type: "delete", oldLineNumber: 2, newLineNumber: null, content: "import { bar } from './bar';", charChanges: [] },
        { type: "add", oldLineNumber: null, newLineNumber: 2, content: "import { baz } from './baz';", charChanges: [] },
        { type: "context", oldLineNumber: 3, newLineNumber: 3, content: "", charChanges: [] },
      ],
      isCollapsed: false,
      isContextHunk: false,
    },
    {
      hunkIndex: 1,
      oldStart: 10,
      oldLines: 2,
      newStart: 11,
      newLines: 2,
      lines: [
        { type: "delete", oldLineNumber: 10, newLineNumber: null, content: "oldFunc();", charChanges: [] },
        { type: "add", oldLineNumber: null, newLineNumber: 11, content: "newFunc();", charChanges: [] },
      ],
      isCollapsed: false,
      isContextHunk: false,
    },
  ];
}

function makeCollapsedSet(indices: number[]): Set<number> {
  return new Set(indices);
}

describe("renderDiffUnifiedView", () => {
  it("renders empty state for no hunks", () => {
    const html = renderDiffUnifiedView([], new Set());
    expect(html).toContain("No changes");
  });

  it("renders all hunks with headers", () => {
    const hunks = makeSampleHunks();
    const html = renderDiffUnifiedView(hunks, new Set());
    expect(html).toContain("@@ -1,3 +1,4 @@");
    expect(html).toContain("@@ -10,2 +11,2 @@");
    expect(html).toContain("bg-emerald-950/30");
    expect(html).toContain("bg-red-950/30");
  });

  it("renders collapsed hunk with only header", () => {
    const hunks = makeSampleHunks();
    const html = renderDiffUnifiedView(hunks, makeCollapsedSet([0]));
    expect(html).toContain("lines hidden");
    expect(html).toContain("expand-hunk");
    // Should not contain the line content of collapsed hunk
    expect(html).not.toContain("import { foo }");
  });

  it("renders context hunk with collapsed state", () => {
    const contextHunk: DiffHunk = {
      hunkIndex: 0,
      oldStart: 5,
      oldLines: 30,
      newStart: 5,
      newLines: 30,
      lines: Array.from({ length: 30 }, (_, i) => ({
        type: "context" as const,
        oldLineNumber: 5 + i,
        newLineNumber: 5 + i,
        content: `unchanged line ${i + 1}`,
        charChanges: [],
      })),
      isCollapsed: true,
      isContextHunk: true,
    };
    const html = renderDiffUnifiedView([contextHunk], new Set([0]));
    expect(html).toContain("30 lines hidden");
  });

  it("applies language option to diff lines", () => {
    const hunks: DiffHunk[] = [
      {
        hunkIndex: 0,
        oldStart: 1,
        oldLines: 1,
        newStart: 1,
        newLines: 1,
        lines: [
          { type: "context", oldLineNumber: 1, newLineNumber: 1, content: "const x = 1;", charChanges: [] },
        ],
        isCollapsed: false,
        isContextHunk: false,
      },
    ];
    const html = renderDiffUnifiedView(hunks, new Set(), { language: "typescript" });
    expect(html).toContain("const x = 1;");
  });
});
