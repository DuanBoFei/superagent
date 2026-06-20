import type { DiffHunk, DiffStatistics } from "../types/diff";

export function calculateStatistics(hunks: DiffHunk[]): DiffStatistics {
  let linesAdded = 0;
  let linesDeleted = 0;
  let linesModified = 0;
  let totalLines = 0;

  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (hunk.isCollapsed) {
        totalLines++;
        continue;
      }

      switch (line.type) {
        case "add":
          linesAdded++;
          break;
        case "delete":
          linesDeleted++;
          break;
        case "modify":
          linesModified++;
          break;
      }
      totalLines++;
    }
  }

  return {
    linesAdded,
    linesDeleted,
    linesModified,
    changeBlocks: hunks.filter(
      (h) =>
        !h.isContextHunk &&
        h.lines.some((l) => l.type === "add" || l.type === "delete" || l.type === "modify"),
    ).length,
    totalLines,
  };
}
