import { describe, expect, it } from "vitest";
import { calculateStatistics } from "../../../../packages/web/src/lib/diff-statistics";
import type { DiffHunk } from "../../../../packages/web/src/types/diff";

function makeHunk(
  lines: Array<{ type: "add" | "delete" | "modify" | "context"; content: string }>,
  collapsed = false,
  contextHunk = false,
): DiffHunk {
  return {
    hunkIndex: 0,
    oldStart: 1,
    oldLines: lines.filter((l) => l.type !== "add").length,
    newStart: 1,
    newLines: lines.filter((l) => l.type !== "delete").length,
    lines: lines.map((l) => ({
      type: l.type,
      oldLineNumber: l.type === "add" ? null : 1,
      newLineNumber: l.type === "delete" ? null : 1,
      content: l.content,
      charChanges: [],
    })),
    isCollapsed: collapsed,
    isContextHunk: contextHunk,
  };
}

describe("calculateStatistics", () => {
  it("returns zeros for empty hunk array", () => {
    const stats = calculateStatistics([]);
    expect(stats).toEqual({
      linesAdded: 0,
      linesDeleted: 0,
      linesModified: 0,
      changeBlocks: 0,
      totalLines: 0,
    });
  });

  it("counts added and deleted lines correctly", () => {
    const hunks: DiffHunk[] = [
      makeHunk([
        { type: "context", content: "unchanged" },
        { type: "add", content: "new line" },
        { type: "add", content: "another new" },
        { type: "context", content: "unchanged" },
      ]),
    ];
    const stats = calculateStatistics(hunks);
    expect(stats.linesAdded).toBe(2);
    expect(stats.linesDeleted).toBe(0);
    expect(stats.changeBlocks).toBe(1);
  });

  it("counts deleted and modified lines", () => {
    const hunks: DiffHunk[] = [
      makeHunk([
        { type: "delete", content: "removed" },
        { type: "add", content: "replacement" },
        { type: "modify", content: "changed" },
      ]),
    ];
    const stats = calculateStatistics(hunks);
    expect(stats.linesAdded).toBe(1);
    expect(stats.linesDeleted).toBe(1);
    expect(stats.linesModified).toBe(1);
    expect(stats.totalLines).toBe(3);
  });

  it("counts change blocks correctly", () => {
    const hunks: DiffHunk[] = [
      makeHunk([{ type: "add", content: "a" }]),
      makeHunk([{ type: "context", content: "c" }], false, true),
    ];
    const stats = calculateStatistics(hunks);
    expect(stats.changeBlocks).toBe(1);
  });

  it("includes collapsed hunks in totalLines but not in line type counts", () => {
    const hunks: DiffHunk[] = [
      makeHunk(
        [
          { type: "add", content: "a" },
          { type: "add", content: "b" },
        ],
        true,
      ),
    ];
    const stats = calculateStatistics(hunks);
    expect(stats.linesAdded).toBe(0);
    expect(stats.totalLines).toBe(2);
  });

  it("handles mixed hunks with correct totals", () => {
    const hunks: DiffHunk[] = [
      makeHunk([
        { type: "delete", content: "d1" },
        { type: "add", content: "a1" },
        { type: "context", content: "c1" },
      ]),
      makeHunk([
        { type: "delete", content: "d2" },
        { type: "delete", content: "d3" },
        { type: "add", content: "a2" },
      ]),
    ];
    const stats = calculateStatistics(hunks);
    expect(stats.linesAdded).toBe(2);
    expect(stats.linesDeleted).toBe(3);
    expect(stats.changeBlocks).toBe(2);
    expect(stats.totalLines).toBe(6);
  });
});
