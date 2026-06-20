import type { TerminalAttributes, TerminalCell, TerminalLine } from "../types/terminal";
import { createDefaultAttributes } from "./ansi-parser/sgr";
import { createCursorState, cursorPosition, cursorUp, cursorDown, cursorForward, cursorBack, cursorNextLine, cursorPrevLine, cursorColumn, cursorShow, cursorHide, cursorSave, cursorRestore } from "./ansi-parser/cursor";
import type { CursorState } from "./ansi-parser/cursor";
import { eraseLine, clearDisplay, eraseInLine, createAlternateScreenState, createScrollRegion, scrollUp, scrollDown } from "./ansi-parser/screen";
import type { AlternateScreenState, ScrollRegion } from "./ansi-parser/screen";

export interface TerminalBuffer {
  // Data
  getLines(): TerminalLine[];
  getCursor(): { x: number; y: number };
  getCursorVisible(): boolean;

  // Text output
  writeChar(char: string): void;
  writeText(text: string): void;

  // Format
  applyAttributes(attrs: TerminalAttributes): void;
  getCurrentAttributes(): TerminalAttributes;

  // Cursor control
  cursorUp(n: number): void;
  cursorDown(n: number): void;
  cursorForward(n: number): void;
  cursorBack(n: number): void;
  cursorNextLine(n: number): void;
  cursorPrevLine(n: number): void;
  cursorSet(row: number, col: number): void;
  cursorColumn(col: number): void;
  cursorShow(): void;
  cursorHide(): void;
  cursorSave(): void;
  cursorRestore(): void;

  // Screen control
  clearDisplay(mode: number): void;
  eraseInLine(mode: number): void;
  setScrollRegion(top: number, bottom: number): void;
  scrollUp(n: number): void;
  scrollDown(n: number): void;

  // Alternate screen
  enterAlternateScreen(): void;
  exitAlternateScreen(): boolean;
  isAlternateScreen(): boolean;

  // Events
  getEvents(): TerminalEvent[];
  clearEvents(): void;
  emitEvent(type: string, payload: unknown): void;

  // State
  reset(): void;
}

type TerminalEventType = "bell" | "alternate-screen-enter" | "alternate-screen-exit";
interface TerminalEvent { type: TerminalEventType; payload: unknown; }

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const DEFAULT_SCROLLBACK = 10000;
const TAB_SIZE = 8;

export interface TerminalBufferOptions {
  cols?: number;
  rows?: number;
  scrollbackSize?: number;
}

export function createTerminalBuffer(options: TerminalBufferOptions = {}): TerminalBuffer {
  const cols = options.cols ?? DEFAULT_COLS;
  const rows = options.rows ?? DEFAULT_ROWS;
  const maxScrollback = options.scrollbackSize ?? DEFAULT_SCROLLBACK;

  let lines: TerminalLine[] = Array.from({ length: rows }, () => createEmptyLine());
  let cursor: CursorState = createCursorState();
  let currentAttributes: TerminalAttributes = createDefaultAttributes();
  let altScreen: AlternateScreenState | null = null;
  let scrollRegion: ScrollRegion = createScrollRegion(rows);
  let events: TerminalEvent[] = [];

  function createEmptyLine(): TerminalLine {
    return {
      cells: [],
      isWrapped: false,
      timestamp: Date.now(),
    };
  }

  function ensureLine(y: number): TerminalLine {
    while (lines.length <= y) {
      lines.push(createEmptyLine());
    }
    return lines[y];
  }

  function trimScrollback(): void {
    while (lines.length > maxScrollback + rows) {
      lines.shift();
      // Adjust cursor.y if needed
      cursor.y = Math.max(0, cursor.y - 1);
    }
  }

  function writeCell(char: string): void {
    if (char === "\n") {
      // Line feed
      cursor.x = 0;
      if (cursor.y < lines.length - 1) {
        cursor.y++;
      } else {
        // New line at bottom
        lines.push(createEmptyLine());
        cursor.y = lines.length - 1;
        trimScrollback();
      }
      return;
    }

    if (char === "\r") {
      cursor.x = 0;
      return;
    }

    if (char === "\t") {
      // Tab to next 8-char stop
      const tabStop = (Math.floor(cursor.x / TAB_SIZE) + 1) * TAB_SIZE;
      const spaces = tabStop - cursor.x;
      for (let i = 0; i < spaces; i++) {
        writeCell(" ");
      }
      return;
    }

    const line = ensureLine(cursor.y);

    // Extend line cells if needed
    while (line.cells.length <= cursor.x) {
      line.cells.push({
        char: " ",
        attributes: { ...currentAttributes },
        width: 1,
      });
    }

    line.cells[cursor.x] = {
      char,
      attributes: { ...currentAttributes },
      width: 1,
    };
    line.timestamp = Date.now();
    cursor.x++;
  }

  const buffer: TerminalBuffer = {
    getLines(): TerminalLine[] {
      return lines;
    },

    getCursor(): { x: number; y: number } {
      return { x: cursor.x, y: cursor.y };
    },

    getCursorVisible(): boolean {
      return cursor.visible;
    },

    writeChar(char: string): void {
      writeCell(char);
    },

    writeText(text: string): void {
      for (const ch of text) {
        writeCell(ch);
      }
    },

    applyAttributes(attrs: TerminalAttributes): void {
      currentAttributes = attrs;
    },

    getCurrentAttributes(): TerminalAttributes {
      return { ...currentAttributes };
    },

    cursorUp(n: number): void {
      cursorUp(cursor, n || 1);
    },

    cursorDown(n: number): void {
      cursorDown(cursor, n || 1, lines.length);
    },

    cursorForward(n: number): void {
      cursorForward(cursor, n || 1, cols);
    },

    cursorBack(n: number): void {
      cursorBack(cursor, n || 1);
    },

    cursorNextLine(n: number): void {
      cursorNextLine(cursor, n || 1, lines.length);
    },

    cursorPrevLine(n: number): void {
      cursorPrevLine(cursor, n || 1);
    },

    cursorSet(row: number, col: number): void {
      cursorPosition(cursor, row, col, lines.length, cols);
    },

    cursorColumn(col: number): void {
      cursorColumn(cursor, col, cols);
    },

    cursorShow(): void {
      cursorShow(cursor);
    },

    cursorHide(): void {
      cursorHide(cursor);
    },

    cursorSave(): void {
      cursorSave(cursor);
    },

    cursorRestore(): void {
      cursorRestore(cursor);
    },

    clearDisplay(mode: number): void {
      lines = clearDisplay(lines, cursor.x, cursor.y, mode);
    },

    eraseInLine(mode: number): void {
      lines = eraseInLine(lines, cursor.x, cursor.y, mode);
    },

    setScrollRegion(top: number, bottom: number): void {
      scrollRegion = {
        top: Math.max(0, Math.min(lines.length - 1, (top || 1) - 1)),
        bottom: Math.max(0, Math.min(lines.length - 1, (bottom || lines.length) - 1)),
      };
    },

    scrollUp(n: number): void {
      lines = scrollUp(lines, n || 1, scrollRegion);
    },

    scrollDown(n: number): void {
      lines = scrollDown(lines, n || 1, scrollRegion);
    },

    enterAlternateScreen(): void {
      altScreen = createAlternateScreenState(rows);
      // Save main buffer state
      altScreen.mainLines = lines;
      altScreen.mainCursorX = cursor.x;
      altScreen.mainCursorY = cursor.y;
      // Switch to alt buffer
      lines = altScreen.altLines;
      cursor.x = 0;
      cursor.y = 0;
      events.push({ type: "alternate-screen-enter", payload: null });
    },

    exitAlternateScreen(): boolean {
      if (!altScreen) return false;
      // Save alt content
      const altContent = lines;
      // Restore main buffer
      lines = altScreen.mainLines;
      cursor.x = altScreen.mainCursorX;
      cursor.y = altScreen.mainCursorY;
      altScreen = null;
      events.push({ type: "alternate-screen-exit", payload: { savedLines: altContent.length } });
      return true;
    },

    isAlternateScreen(): boolean {
      return altScreen !== null;
    },

    getEvents(): TerminalEvent[] {
      return events;
    },

    clearEvents(): void {
      events = [];
    },

    emitEvent(type: string, payload: unknown): void {
      events.push({ type: type as TerminalEventType, payload });
    },

    reset(): void {
      lines = Array.from({ length: rows }, () => createEmptyLine());
      cursor = createCursorState();
      currentAttributes = createDefaultAttributes();
      altScreen = null;
      scrollRegion = createScrollRegion(rows);
      events = [];
    },
  };

  return buffer;
}
