import { describe, expect, it } from "vitest";
import {
  computeDiffHunks,
  markContextHunks,
  parseUnifiedDiff,
} from "../../../../packages/web/src/lib/diff-parser";
import type { DiffHunk } from "../../../../packages/web/src/types/diff";

const SAMPLE_UNIFIED_DIFF = `diff --git a/src/utils.ts b/src/utils.ts
index abc123..def456 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,3 +1,4 @@
 import { foo } from "./foo";
 import { bar } from "./bar";
-import { baz } from "./baz";
+import { qux } from "./qux";
+import { extra } from "./extra";
 context line
@@ -10,5 +11,4 @@
 old context line
-deleted function call();
-added function call();
+modified function call();
 more context
`;

describe("parseUnifiedDiff", () => {
  it("parses a valid unified diff string into hunks", () => {
    const hunks = parseUnifiedDiff(SAMPLE_UNIFIED_DIFF);
    expect(hunks.length).toBeGreaterThanOrEqual(1);

    const firstHunk = hunks[0];
    expect(firstHunk.oldStart).toBe(1);
    expect(firstHunk.newStart).toBe(1);
    expect(firstHunk.lines.length).toBeGreaterThan(0);

    const hasDeletedLine = firstHunk.lines.some((l) => l.type === "delete");
    const hasAddedLine = firstHunk.lines.some((l) => l.type === "add");
    const hasContextLine = firstHunk.lines.some((l) => l.type === "context");
    expect(hasDeletedLine).toBe(true);
    expect(hasAddedLine).toBe(true);
    expect(hasContextLine).toBe(true);
  });

  it("returns empty array for empty string input", () => {
    const hunks = parseUnifiedDiff("");
    expect(hunks).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    const hunks = parseUnifiedDiff("   \n  \n  ");
    expect(hunks).toEqual([]);
  });

  it("assigns sequential hunkIndices", () => {
    const hunks = parseUnifiedDiff(SAMPLE_UNIFIED_DIFF);
    for (let i = 0; i < hunks.length; i++) {
      expect(hunks[i].hunkIndex).toBe(i);
    }
  });

  it("correctly assigns line numbers", () => {
    const hunks = parseUnifiedDiff(SAMPLE_UNIFIED_DIFF);
    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === "add") {
          expect(line.oldLineNumber).toBeNull();
          expect(line.newLineNumber).not.toBeNull();
        } else if (line.type === "delete") {
          expect(line.oldLineNumber).not.toBeNull();
          expect(line.newLineNumber).toBeNull();
        } else if (line.type === "context") {
          expect(line.oldLineNumber).not.toBeNull();
          expect(line.newLineNumber).not.toBeNull();
        }
      }
    }
  });

  it("strips prefix characters from content", () => {
    const simpleDiff = "@@ -1,0 +1,1 @@\n+added line\n";
    const hunks = parseUnifiedDiff(simpleDiff);
    const addLine = hunks[0].lines.find((l) => l.type === "add");
    expect(addLine?.content).toBe("added line");
    expect(addLine?.content).not.toContain("+");
  });

  it("gracefully degrades on malformed diff text", () => {
    const badInput = "+added line\n-deleted line\n context\n";
    const hunks = parseUnifiedDiff(badInput);
    expect(hunks.length).toBeGreaterThan(0);
    expect(hunks[0].lines.length).toBeGreaterThan(0);
  });
});

describe("computeDiffHunks", () => {
  it("returns empty array for identical content", () => {
    const content = "line 1\nline 2\nline 3\n";
    const hunks = computeDiffHunks(content, content);
    expect(hunks).toEqual([]);
  });

  it("detects added lines", () => {
    const oldContent = "line 1\nline 2\n";
    const newContent = "line 1\nline 2\nline 3\n";
    const hunks = computeDiffHunks(oldContent, newContent);
    expect(hunks.length).toBeGreaterThan(0);
    const allLines = hunks.flatMap((h) => h.lines);
    const addedLines = allLines.filter((l) => l.type === "add");
    expect(addedLines.length).toBe(1);
    expect(addedLines[0].content).toBe("line 3");
  });

  it("detects deleted lines", () => {
    const oldContent = "line 1\nline 2\nline 3\n";
    const newContent = "line 1\nline 3\n";
    const hunks = computeDiffHunks(oldContent, newContent);
    const allLines = hunks.flatMap((h) => h.lines);
    const deletedLines = allLines.filter((l) => l.type === "delete");
    expect(deletedLines.length).toBe(1);
    expect(deletedLines[0].content).toBe("line 2");
  });

  it("detects modified lines", () => {
    const oldContent = "const x = 1;\nconst y = 2;\n";
    const newContent = "const x = 1;\nconst y = 3;\n";
    const hunks = computeDiffHunks(oldContent, newContent);
    const allLines = hunks.flatMap((h) => h.lines);
    expect(allLines.some((l) => l.type === "delete")).toBe(true);
    expect(allLines.some((l) => l.type === "add")).toBe(true);
  });

  it("handles empty old content", () => {
    const hunks = computeDiffHunks("", "new file content\nline 2\n");
    expect(hunks.length).toBeGreaterThan(0);
    const allLines = hunks.flatMap((h) => h.lines);
    expect(allLines.every((l) => l.type === "add")).toBe(true);
  });

  it("handles empty new content", () => {
    const hunks = computeDiffHunks("file to delete\nline 2\n", "");
    expect(hunks.length).toBeGreaterThan(0);
    const allLines = hunks.flatMap((h) => h.lines);
    expect(allLines.every((l) => l.type === "delete")).toBe(true);
  });

  it("groups changes into hunks with context", () => {
    const oldContent = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join("\n");
    const newContent = Array.from({ length: 50 }, (_, i) => {
      if (i === 20) return "CHANGED line 21";
      if (i === 40) return "CHANGED line 41";
      return `line ${i + 1}`;
    }).join("\n");

    const hunks = computeDiffHunks(oldContent, newContent);
    expect(hunks.length).toBeGreaterThanOrEqual(1);
    for (const hunk of hunks) {
      expect(hunk.hunkIndex).toBeGreaterThanOrEqual(0);
      expect(hunk.lines.length).toBeGreaterThan(0);
    }
  });
});

describe("markContextHunks", () => {
  it("marks long context-only hunks as collapsed", () => {
    const lines = Array.from({ length: 30 }, (_, i) => ({
      type: "context" as const,
      oldLineNumber: i + 1,
      newLineNumber: i + 1,
      content: `line ${i + 1}`,
      charChanges: [],
    }));

    const hunks: DiffHunk[] = [
      {
        hunkIndex: 0,
        oldStart: 1,
        oldLines: 30,
        newStart: 1,
        newLines: 30,
        lines,
        isCollapsed: false,
        isContextHunk: false,
      },
    ];

    const marked = markContextHunks(hunks, 20);
    expect(marked[0].isContextHunk).toBe(true);
    expect(marked[0].isCollapsed).toBe(true);
  });

  it("does not mark short context sections", () => {
    const lines = Array.from({ length: 15 }, (_, i) => ({
      type: "context" as const,
      oldLineNumber: i + 1,
      newLineNumber: i + 1,
      content: `line ${i + 1}`,
      charChanges: [],
    }));

    const hunks: DiffHunk[] = [
      {
        hunkIndex: 0,
        oldStart: 1,
        oldLines: 15,
        newStart: 1,
        newLines: 15,
        lines,
        isCollapsed: false,
        isContextHunk: false,
      },
    ];

    const marked = markContextHunks(hunks, 20);
    expect(marked[0].isContextHunk).toBe(false);
    expect(marked[0].isCollapsed).toBe(false);
  });

  it("does not mark hunks that contain changes", () => {
    const lines = [
      ...Array.from({ length: 25 }, (_, i) => ({
        type: "context" as const,
        oldLineNumber: i + 1,
        newLineNumber: i + 1,
        content: `line ${i + 1}`,
        charChanges: [],
      })),
      {
        type: "add" as const,
        oldLineNumber: null,
        newLineNumber: 26,
        content: "new line",
        charChanges: [],
      },
    ];

    const hunks: DiffHunk[] = [
      {
        hunkIndex: 0,
        oldStart: 1,
        oldLines: 25,
        newStart: 1,
        newLines: 26,
        lines,
        isCollapsed: false,
        isContextHunk: false,
      },
    ];

    const marked = markContextHunks(hunks, 20);
    expect(marked[0].isContextHunk).toBe(false);
  });
});
