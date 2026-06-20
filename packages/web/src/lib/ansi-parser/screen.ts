import type { TerminalLine } from "../../types/terminal";
import { createDefaultAttributes } from "./sgr";

// Create an empty cell
export function emptyCell(): { char: string; attributes: ReturnType<typeof createDefaultAttributes>; width: 1 | 2 } {
  return {
    char: " ",
    attributes: createDefaultAttributes(),
    width: 1,
  };
}

// Erase portion of a single line
// mode 0: cursor to end of line
// mode 1: start to cursor (inclusive)
// mode 2: entire line
export function eraseLine(
  line: TerminalLine | null,
  cursorX: number,
  mode: number,
): TerminalLine {
  if (!line) return createEmptyLine(0, false);

  const cells = [...line.cells];
  const length = cells.length;

  let start = 0;
  let end = length;

  if (mode === 0) {
    start = Math.min(cursorX, length);
    end = length;
  } else if (mode === 1) {
    start = 0;
    end = Math.min(cursorX + 1, length);
  } else if (mode === 2) {
    start = 0;
    end = length;
  }

  // Replace erased cells with empty spaces
  for (let i = start; i < end; i++) {
    if (i < cells.length) {
      cells[i] = emptyCell();
    }
  }

  return {
    cells,
    isWrapped: line.isWrapped,
    timestamp: Date.now(),
  };
}

// Clear display from a buffer perspective
// mode 0: clear from cursor to end of display
// mode 1: clear from start to cursor
// mode 2: clear entire display
// Returns the modified lines array
export function clearDisplay(
  lines: TerminalLine[],
  cursorX: number,
  cursorY: number,
  mode: number,
): TerminalLine[] {
  if (mode === 2) {
    // Clear entire display — reset all lines, keep array length
    return lines.map((_, i) => createEmptyLine(i, false, colCount(lines, i)));
  }

  const result = lines.map((l) => ({ ...l, cells: [...l.cells] }));

  if (mode === 0) {
    // Clear cursor line from cursor to end
    if (cursorY < result.length) {
      result[cursorY] = eraseLine(result[cursorY], cursorX, 0);
    }
    // Clear all lines below
    for (let i = cursorY + 1; i < result.length; i++) {
      result[i] = createEmptyLine(i, false, colCount(lines, i));
    }
  } else if (mode === 1) {
    // Clear all lines above
    for (let i = 0; i < cursorY; i++) {
      result[i] = createEmptyLine(i, false, colCount(lines, i));
    }
    // Clear cursor line from start to cursor
    if (cursorY < result.length) {
      result[cursorY] = eraseLine(result[cursorY], cursorX, 1);
    }
  }

  return result;
}

// Erase characters in current line
// mode 0: erase from cursor to end
// mode 1: erase from start to cursor
// mode 2: erase entire line
export function eraseInLine(
  lines: TerminalLine[],
  cursorX: number,
  cursorY: number,
  mode: number,
): TerminalLine[] {
  const result = lines.map((l) => ({ ...l, cells: [...l.cells] }));
  if (cursorY < result.length) {
    result[cursorY] = eraseLine(result[cursorY], cursorX, mode);
  }
  return result;
}

function createEmptyLine(y: number, isWrapped: boolean, colCount: number = 0): TerminalLine {
  return {
    cells: Array.from({ length: colCount }, () => emptyCell()),
    isWrapped,
    timestamp: Date.now(),
  };
}

// Get column count from a line or default
function colCount(lines: TerminalLine[], index: number): number {
  if (index < lines.length && lines[index].cells.length > 0) {
    return lines[index].cells.length;
  }
  // Fallback to any non-empty line's count
  for (const line of lines) {
    if (line.cells.length > 0) return line.cells.length;
  }
  return 0;
}

// Alternate screen buffer management
export interface AlternateScreenState {
  mainLines: TerminalLine[];
  mainCursorX: number;
  mainCursorY: number;
  altLines: TerminalLine[];
  altCursorX: number;
  altCursorY: number;
}

export function createAlternateScreenState(rowCount: number = 24): AlternateScreenState {
  return {
    mainLines: [],
    mainCursorX: 0,
    mainCursorY: 0,
    altLines: Array.from({ length: rowCount }, (_, i) => createEmptyLine(i, false)),
    altCursorX: 0,
    altCursorY: 0,
  };
}

export function isAlternateScreenActive(state: AlternateScreenState | null): boolean {
  return state !== null;
}

// Scroll region operations
export interface ScrollRegion {
  top: number;
  bottom: number;
}

export function createScrollRegion(rows: number): ScrollRegion {
  return { top: 0, bottom: rows - 1 };
}

// Scroll up: lines within [top, bottom] move up by n, bottom area cleared
export function scrollUp(
  lines: TerminalLine[],
  n: number,
  region: ScrollRegion,
): TerminalLine[] {
  const result = lines.map((l) => ({ ...l, cells: [...l.cells] }));
  const { top, bottom } = region;
  const moveLines = Math.min(n, bottom - top + 1);

  for (let i = top; i <= bottom; i++) {
    const srcIdx = i + moveLines;
    if (srcIdx <= bottom) {
      result[i] = result[srcIdx];
    } else {
      result[i] = createEmptyLine(i, false, colCount(lines, i));
    }
  }

  return result;
}

// Scroll down: lines within [top, bottom] move down by n, top area cleared
export function scrollDown(
  lines: TerminalLine[],
  n: number,
  region: ScrollRegion,
): TerminalLine[] {
  const result = lines.map((l) => ({ ...l, cells: [...l.cells] }));
  const { top, bottom } = region;
  const moveLines = Math.min(n, bottom - top + 1);

  for (let i = bottom; i >= top; i--) {
    const srcIdx = i - moveLines;
    if (srcIdx >= top) {
      result[i] = result[srcIdx];
    } else {
      result[i] = createEmptyLine(i, false, colCount(lines, i));
    }
  }

  return result;
}
