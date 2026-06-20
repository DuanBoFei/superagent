import { diffLines, parsePatch } from "diff";
import type { DiffHunk, DiffLine, DiffLineType } from "../types/diff";

const CONTEXT_LINES = 3;

export interface ParsedResult {
  hunks: DiffHunk[];
  totalLines: number;
}

function classifyLineType(line: string): DiffLineType {
  if (line.startsWith("+")) {
    return "add";
  }
  if (line.startsWith("-")) {
    return "delete";
  }
  return "context";
}

function lineContent(line: string): string {
  if (line.startsWith("+") || line.startsWith("-")) {
    return line.slice(1);
  }
  if (line.startsWith(" ")) {
    return line.slice(1);
  }
  return line;
}

export function parseUnifiedDiff(diffText: string): DiffHunk[] {
  if (!diffText || !diffText.trim()) {
    return [];
  }

  try {
    const patches = parsePatch(diffText.trimEnd() + "\n");
    if (!patches || patches.length === 0) {
      return fallbackParse(diffText);
    }

    const allHunks: DiffHunk[] = [];
    let hunkIndex = 0;

    for (const patch of patches) {
      if (!patch.hunks || patch.hunks.length === 0) {
        continue;
      }
      for (const hunk of patch.hunks) {
        const lines: DiffLine[] = [];
        let oldLineNum = hunk.oldStart;
        let newLineNum = hunk.newStart;

        for (const rawLine of hunk.lines) {
          const type = classifyLineType(rawLine);
          lines.push({
            type,
            oldLineNumber: type === "add" ? null : oldLineNum++,
            newLineNumber: type === "delete" ? null : newLineNum++,
            content: lineContent(rawLine),
            charChanges: [],
          });
        }

        allHunks.push({
          hunkIndex: hunkIndex++,
          oldStart: hunk.oldStart,
          oldLines: hunk.oldLines,
          newStart: hunk.newStart,
          newLines: hunk.newLines,
          lines,
          isCollapsed: false,
          isContextHunk: false,
        });
      }
    }

    if (allHunks.length === 0) {
      return fallbackParse(diffText);
    }
    return allHunks;
  } catch {
    return fallbackParse(diffText);
  }
}

function fallbackParse(diffText: string): DiffHunk[] {
  const rawLines = diffText.split("\n");
  const lines: DiffLine[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;

  for (const rawLine of rawLines) {
    if (rawLine.startsWith("+")) {
      lines.push({
        type: "add",
        oldLineNumber: null,
        newLineNumber: newLineNum++,
        content: rawLine.slice(1),
        charChanges: [],
      });
    } else if (rawLine.startsWith("-")) {
      lines.push({
        type: "delete",
        oldLineNumber: oldLineNum++,
        newLineNumber: null,
        content: rawLine.slice(1),
        charChanges: [],
      });
    } else {
      const content = rawLine.startsWith(" ") ? rawLine.slice(1) : rawLine;
      lines.push({
        type: "context",
        oldLineNumber: oldLineNum++,
        newLineNumber: newLineNum++,
        content,
        charChanges: [],
      });
    }
  }

  if (lines.length === 0) {
    return [];
  }

  return [
    {
      hunkIndex: 0,
      oldStart: 1,
      oldLines: lines.filter((l) => l.type !== "add").length,
      newStart: 1,
      newLines: lines.filter((l) => l.type !== "delete").length,
      lines,
      isCollapsed: false,
      isContextHunk: false,
    },
  ];
}

export function computeDiffHunks(
  oldContent: string,
  newContent: string,
): DiffHunk[] {
  if (oldContent === newContent) {
    return [];
  }

  try {
    const changes = diffLines(oldContent, newContent);

    const lines: DiffLine[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    for (const change of changes) {
      const changeLines = change.value.split("\n");
      // Drop trailing empty string from split
      if (changeLines[changeLines.length - 1] === "") {
        changeLines.pop();
      }

      for (const content of changeLines) {
        if (change.added) {
          lines.push({
            type: "add",
            oldLineNumber: null,
            newLineNumber: newLineNum++,
            content,
            charChanges: [],
          });
        } else if (change.removed) {
          lines.push({
            type: "delete",
            oldLineNumber: oldLineNum++,
            newLineNumber: null,
            content,
            charChanges: [],
          });
        } else {
          lines.push({
            type: "context",
            oldLineNumber: oldLineNum++,
            newLineNumber: newLineNum++,
            content,
            charChanges: [],
          });
        }
      }
    }

    if (lines.length === 0) {
      return [];
    }

    return groupIntoHunks(lines);
  } catch {
    return [];
  }
}

function groupIntoHunks(lines: DiffLine[]): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentHunkLines: DiffLine[] = [];
  let consecutiveContext = 0;

  for (const line of lines) {
    if (line.type === "context") {
      consecutiveContext++;
    } else {
      consecutiveContext = 0;
    }

    currentHunkLines.push(line);

    // Split when we have enough trailing context
    if (consecutiveContext >= CONTEXT_LINES * 2 && currentHunkLines.length > 0) {
      // Check if there are any change lines in the current batch before splitting
      const hasChanges = currentHunkLines.some(
        (l) => l.type === "add" || l.type === "delete",
      );

      if (hasChanges) {
        // Find the split point: keep CONTEXT_LINES trailing context in current hunk
        const splitAt =
          currentHunkLines.length - CONTEXT_LINES;
        hunks.push(buildHunk(hunks.length, currentHunkLines.slice(0, splitAt)));
        currentHunkLines = currentHunkLines.slice(splitAt);
      }
    }
  }

  if (currentHunkLines.length > 0) {
    hunks.push(buildHunk(hunks.length, currentHunkLines));
  }

  return hunks;
}

function buildHunk(hunkIndex: number, lines: DiffLine[]): DiffHunk {
  const firstOld = lines.find((l) => l.oldLineNumber !== null);
  const firstNew = lines.find((l) => l.newLineNumber !== null);
  const oldLines = lines.filter((l) => l.type !== "add").length;
  const newLines = lines.filter((l) => l.type !== "delete").length;

  return {
    hunkIndex,
    oldStart: firstOld?.oldLineNumber ?? 1,
    oldLines,
    newStart: firstNew?.newLineNumber ?? 1,
    newLines,
    lines,
    isCollapsed: false,
    isContextHunk: false,
  };
}

export function markContextHunks(
  hunks: DiffHunk[],
  threshold = 20,
): DiffHunk[] {
  return hunks.map((hunk) => {
    const hasOnlyContext = hunk.lines.every((l) => l.type === "context");
    const isLongContext = hunk.lines.length > threshold;
    return {
      ...hunk,
      isContextHunk: hasOnlyContext && isLongContext,
      isCollapsed: hasOnlyContext && isLongContext ? true : hunk.isCollapsed,
    };
  });
}
