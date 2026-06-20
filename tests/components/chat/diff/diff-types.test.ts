import { describe, expect, it } from "vitest";
import type {
  CharChange,
  DiffHunk,
  DiffLine,
  DiffLineType,
  DiffNavigationPosition,
  DiffStatistics,
  DiffViewerProps,
  DiffViewMode,
} from "../../../../packages/web/src/types/diff";

describe("diff type contracts", () => {
  it("constrains DiffViewMode to unified and split", () => {
    const modes: DiffViewMode[] = ["unified", "split"];
    expect(modes).toHaveLength(2);
  });

  it("constrains DiffLineType to the 5 line variants", () => {
    const types: DiffLineType[] = ["add", "delete", "modify", "context", "empty"];
    expect(types).toHaveLength(5);
  });

  it("allows constructing a valid DiffLine with char changes", () => {
    const charChanges: CharChange[] = [
      { start: 4, end: 8, type: "delete" },
      { start: 4, end: 12, type: "add" },
    ];
    const line: DiffLine = {
      type: "modify",
      oldLineNumber: 42,
      newLineNumber: 42,
      content: "const foo = bar();",
      charChanges,
    };
    expect(line.type).toBe("modify");
    expect(line.oldLineNumber).toBe(42);
    expect(line.newLineNumber).toBe(42);
    expect(line.charChanges).toHaveLength(2);
    expect(line.charChanges[0].type).toBe("delete");
    expect(line.charChanges[1].type).toBe("add");
  });

  it("allows constructing an add DiffLine with null oldLineNumber", () => {
    const line: DiffLine = {
      type: "add",
      oldLineNumber: null,
      newLineNumber: 55,
      content: "+  return result;",
      charChanges: [],
    };
    expect(line.type).toBe("add");
    expect(line.oldLineNumber).toBeNull();
    expect(line.newLineNumber).toBe(55);
  });

  it("allows constructing a delete DiffLine with null newLineNumber", () => {
    const line: DiffLine = {
      type: "delete",
      oldLineNumber: 33,
      newLineNumber: null,
      content: "-  const tmp = [];",
      charChanges: [],
    };
    expect(line.type).toBe("delete");
    expect(line.oldLineNumber).toBe(33);
    expect(line.newLineNumber).toBeNull();
  });

  it("allows constructing an empty placeholder DiffLine", () => {
    const line: DiffLine = {
      type: "empty",
      oldLineNumber: null,
      newLineNumber: null,
      content: "",
      charChanges: [],
    };
    expect(line.type).toBe("empty");
    expect(line.oldLineNumber).toBeNull();
    expect(line.newLineNumber).toBeNull();
    expect(line.content).toBe("");
  });

  it("allows constructing a DiffHunk with collapsed state", () => {
    const hunk: DiffHunk = {
      hunkIndex: 0,
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 4,
      lines: [
        { type: "context", oldLineNumber: 1, newLineNumber: 1, content: "  import { foo };", charChanges: [] },
        { type: "add", oldLineNumber: null, newLineNumber: 2, content: "+  import { bar };", charChanges: [] },
        { type: "delete", oldLineNumber: 2, newLineNumber: null, content: "-  import { baz };", charChanges: [] },
        { type: "context", oldLineNumber: 3, newLineNumber: 3, content: "  import { qux };", charChanges: [] },
      ],
      isCollapsed: false,
      isContextHunk: false,
    };
    expect(hunk.hunkIndex).toBe(0);
    expect(hunk.oldStart).toBe(1);
    expect(hunk.newLines).toBe(4);
    expect(hunk.lines).toHaveLength(4);
    expect(hunk.isCollapsed).toBe(false);
    expect(hunk.isContextHunk).toBe(false);
  });

  it("allows constructing a context hunk that is collapsed", () => {
    const hunk: DiffHunk = {
      hunkIndex: 3,
      oldStart: 100,
      oldLines: 50,
      newStart: 102,
      newLines: 50,
      lines: Array.from({ length: 50 }, (_, i) => ({
        type: "context" as const,
        oldLineNumber: 100 + i,
        newLineNumber: 102 + i,
        content: `  // unchanged line ${i + 1}`,
        charChanges: [],
      })),
      isCollapsed: true,
      isContextHunk: true,
    };
    expect(hunk.isCollapsed).toBe(true);
    expect(hunk.isContextHunk).toBe(true);
    expect(hunk.lines).toHaveLength(50);
  });

  it("computes DiffStatistics correct totals", () => {
    const stats: DiffStatistics = {
      linesAdded: 15,
      linesDeleted: 7,
      linesModified: 3,
      changeBlocks: 4,
      totalLines: 200,
    };
    expect(stats.linesAdded).toBe(15);
    expect(stats.linesDeleted).toBe(7);
    expect(stats.linesModified).toBe(3);
    expect(stats.changeBlocks).toBe(4);
    expect(stats.totalLines).toBe(200);
  });

  it("tracks DiffNavigationPosition correctly", () => {
    const pos: DiffNavigationPosition = {
      currentHunkIndex: 2,
      currentLineIndex: 45,
      totalHunks: 8,
    };
    expect(pos.currentHunkIndex).toBe(2);
    expect(pos.currentLineIndex).toBe(45);
    expect(pos.totalHunks).toBe(8);
  });

  it("accepts DiffViewerProps with unified diff string input", () => {
    const props: DiffViewerProps = {
      diff: "@@ -1,3 +1,4 @@\n context\n-added\n-deleted\n+modified",
      filePath: "src/utils.ts",
      language: "typescript",
      defaultViewMode: "unified",
      showStatistics: true,
      showNavigation: true,
      virtualScrollThreshold: 500,
    };
    expect(props.diff).toBeDefined();
    expect(props.defaultViewMode).toBe("unified");
    expect(props.virtualScrollThreshold).toBe(500);
  });

  it("accepts DiffViewerProps with old/new content pair", () => {
    const props: DiffViewerProps = {
      oldContent: "const a = 1;",
      newContent: "const a = 2;",
      filePath: "src/main.ts",
    };
    expect(props.oldContent).toBeDefined();
    expect(props.newContent).toBeDefined();
    expect(props.diff).toBeUndefined();
  });
});
