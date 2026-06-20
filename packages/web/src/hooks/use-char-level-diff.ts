import { computeCharChanges } from "../lib/char-level-diff";
import type { DiffHunk, DiffLine } from "../types/diff";

export interface CharLevelDiffOptions {
  enabled?: boolean;
  skipContextLines?: boolean;
}

export function applyCharLevelDiff(
  hunks: DiffHunk[],
  options: CharLevelDiffOptions = {},
): DiffHunk[] {
  if (options.enabled === false) {
    return hunks;
  }

  return hunks.map((hunk) => {
    // Only compute char changes for modify-type lines and changed lines
    const lines = hunk.lines.map((line) => {
      if (options.skipContextLines && line.type === "context") {
        return { ...line, charChanges: [] };
      }

      // For modify lines, compare with nearby opposite line
      if (line.type === "modify" && line.content) {
        return {
          ...line,
          charChanges: computeCharChanges(line.content, line.content),
        };
      }

      // For add/delete pairs that replace each other, compute char diff
      if (
        (line.type === "add" || line.type === "delete") &&
        line.content &&
        line.charChanges.length === 0
      ) {
        const partner = findPartnerLine(line, hunk.lines);
        if (partner) {
          const oldText = line.type === "delete" ? line.content : partner.content;
          const newText = line.type === "add" ? line.content : partner.content;
          const charChanges = computeCharChanges(oldText, newText);
          if (charChanges.length > 0) {
            return {
              ...line,
              charChanges: charChanges.filter(
                (c) =>
                  (line.type === "add" && c.type === "add") ||
                  (line.type === "delete" && c.type === "delete"),
              ),
            };
          }
        }
      }

      return line;
    });

    return { ...hunk, lines };
  });
}

function findPartnerLine(
  line: DiffLine,
  allLines: DiffLine[],
): DiffLine | null {
  const lineIdx = allLines.indexOf(line);
  if (lineIdx < 0) {
    return null;
  }

  // Look at adjacent lines for an opposite-type partner
  const candidates = [
    allLines[lineIdx - 1],
    allLines[lineIdx + 1],
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (
      (line.type === "add" && candidate.type === "delete") ||
      (line.type === "delete" && candidate.type === "add")
    ) {
      return candidate;
    }
  }

  return null;
}
