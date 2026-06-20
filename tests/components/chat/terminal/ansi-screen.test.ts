import { describe, expect, it } from "vitest";
import {
  clearDisplay,
  createAlternateScreenState,
  createScrollRegion,
  emptyCell,
  eraseInLine,
  eraseLine,
  isAlternateScreenActive,
  scrollDown,
  scrollUp,
} from "../../../../packages/web/src/lib/ansi-parser/screen";
import type { TerminalLine } from "../../../../packages/web/src/types/terminal";

function makeLine(y: number, chars: string[]): TerminalLine {
  return {
    cells: chars.map((c) => ({
      char: c,
      attributes: {
        foreground: null,
        background: null,
        bold: false,
        dim: false,
        italic: false,
        underline: false,
        blink: false,
        inverse: false,
        hidden: false,
        strikethrough: false,
      },
      width: 1 as const,
    })),
    isWrapped: false,
    timestamp: Date.now(),
  };
}

function makeLines(count: number): TerminalLine[] {
  return Array.from({ length: count }, (_, i) =>
    makeLine(i, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")),
  );
}

describe("ansi screen manager", () => {
  describe("emptyCell", () => {
    it("returns a space character with default attributes", () => {
      const cell = emptyCell();
      expect(cell.char).toBe(" ");
      expect(cell.width).toBe(1);
      expect(cell.attributes.bold).toBe(false);
      expect(cell.attributes.foreground).toBeNull();
    });
  });

  describe("eraseLine", () => {
    it("mode 0: erases from cursor to end of line", () => {
      const line = makeLine(0, "ABCDEFGHIJ".split(""));
      const result = eraseLine(line, 4, 0);
      // chars 0-3 remain, 4-9 become spaces
      expect(result.cells[0].char).toBe("A");
      expect(result.cells[3].char).toBe("D");
      expect(result.cells[4].char).toBe(" ");
      expect(result.cells[9].char).toBe(" ");
    });

    it("mode 1: erases from start to cursor inclusive", () => {
      const line = makeLine(0, "ABCDEFGHIJ".split(""));
      const result = eraseLine(line, 3, 1);
      // chars 0-3 become spaces, 4-9 remain
      expect(result.cells[0].char).toBe(" ");
      expect(result.cells[2].char).toBe(" ");
      expect(result.cells[3].char).toBe(" ");
      expect(result.cells[4].char).toBe("E");
      expect(result.cells[9].char).toBe("J");
    });

    it("mode 2: erases entire line", () => {
      const line = makeLine(0, "ABCDEFGHIJ".split(""));
      const result = eraseLine(line, 0, 2);
      for (const cell of result.cells) {
        expect(cell.char).toBe(" ");
      }
    });

    it("handles null line gracefully", () => {
      const result = eraseLine(null, 0, 0);
      expect(result.cells).toHaveLength(0);
    });

    it("mode 0 with cursor beyond line length does nothing", () => {
      const line = makeLine(0, "AB".split(""));
      const result = eraseLine(line, 10, 0);
      expect(result.cells[0].char).toBe("A");
      expect(result.cells[1].char).toBe("B");
    });
  });

  describe("clearDisplay", () => {
    it("mode 2: clears entire display", () => {
      const lines = makeLines(5);
      const result = clearDisplay(lines, 0, 0, 2);
      for (const line of result) {
        for (const cell of line.cells) {
          expect(cell.char).toBe(" ");
        }
      }
    });

    it("mode 0: clears from cursor to end", () => {
      const lines = makeLines(5); // 5 lines with A-Z each
      const result = clearDisplay(lines, 5, 2, 0);
      // Line 2: chars 0-4 remain, 5+ cleared
      // Lines 3-4: fully cleared
      expect(result[0].cells[0].char).toBe("A"); // untouched
      expect(result[1].cells[0].char).toBe("A"); // untouched
      expect(result[2].cells[4].char).toBe("E"); // before cursor
      expect(result[2].cells[5].char).toBe(" "); // after cursor
      expect(result[3].cells[0].char).toBe(" "); // cleared
      expect(result[4].cells[0].char).toBe(" "); // cleared
    });

    it("mode 1: clears from start to cursor", () => {
      const lines = makeLines(5);
      const result = clearDisplay(lines, 3, 3, 1);
      // Lines 0-2: fully cleared
      // Line 3: chars 0-3 cleared, 4+ remain
      expect(result[0].cells[0].char).toBe(" ");
      expect(result[2].cells[0].char).toBe(" ");
      expect(result[3].cells[0].char).toBe(" ");
      expect(result[3].cells[3].char).toBe(" ");
      expect(result[3].cells[4].char).toBe("E");
      expect(result[4].cells[0].char).toBe("A"); // untouched
    });
  });

  describe("eraseInLine", () => {
    it("erases portion of specific line and returns new array", () => {
      const lines = makeLines(3);
      const result = eraseInLine(lines, 3, 1, 0);
      // Line 1 from col 3 to end should be spaces
      expect(result[0].cells[0].char).toBe("A"); // untouched
      expect(result[1].cells[2].char).toBe("C"); // before cursor
      expect(result[1].cells[3].char).toBe(" ");
      expect(result[2].cells[0].char).toBe("A"); // untouched
    });

    it("handles cursorY beyond array length", () => {
      const lines = makeLines(2);
      const result = eraseInLine(lines, 0, 5, 0);
      // Should not crash
      expect(result).toHaveLength(2);
    });
  });

  describe("alternate screen state", () => {
    it("creates alternate screen with empty alt lines", () => {
      const state = createAlternateScreenState(24);
      expect(state.altLines).toHaveLength(24);
      expect(state.mainLines).toHaveLength(0);
      expect(state.altCursorX).toBe(0);
      expect(state.altCursorY).toBe(0);
    });

    it("isAlternateScreenActive returns true when state exists", () => {
      const state = createAlternateScreenState(24);
      expect(isAlternateScreenActive(state)).toBe(true);
    });

    it("isAlternateScreenActive returns false for null", () => {
      expect(isAlternateScreenActive(null)).toBe(false);
    });
  });

  describe("scrollRegion", () => {
    it("creates scroll region with top=0, bottom=rows-1", () => {
      const region = createScrollRegion(24);
      expect(region.top).toBe(0);
      expect(region.bottom).toBe(23);
    });
  });

  describe("scrollUp", () => {
    it("moves lines up within scroll region", () => {
      const lines = makeLines(5);
      // Modify each line slightly so we can identify them
      lines[0].cells[0].char = "0";
      lines[1].cells[0].char = "1";
      lines[2].cells[0].char = "2";
      lines[3].cells[0].char = "3";
      lines[4].cells[0].char = "4";

      const region = createScrollRegion(5);
      const result = scrollUp(lines, 1, region);
      // Line 0 gets line 1's content, line 1 gets line 2's, etc.
      // Last line cleared
      expect(result[0].cells[0].char).toBe("1");
      expect(result[1].cells[0].char).toBe("2");
      expect(result[2].cells[0].char).toBe("3");
      expect(result[3].cells[0].char).toBe("4");
      expect(result[4].cells[0].char).toBe(" ");
    });

    it("scrolls multiple lines", () => {
      const lines = makeLines(5);
      lines[0].cells[0].char = "0";
      lines[1].cells[0].char = "1";
      lines[2].cells[0].char = "2";
      lines[3].cells[0].char = "3";
      lines[4].cells[0].char = "4";

      const region = createScrollRegion(5);
      const result = scrollUp(lines, 2, region);
      expect(result[0].cells[0].char).toBe("2");
      expect(result[1].cells[0].char).toBe("3");
      expect(result[2].cells[0].char).toBe("4");
      expect(result[3].cells[0].char).toBe(" ");
      expect(result[4].cells[0].char).toBe(" ");
    });

    it("scroll n larger than region height clears all", () => {
      const lines = makeLines(3);
      lines[0].cells[0].char = "0";
      lines[1].cells[0].char = "1";
      lines[2].cells[0].char = "2";

      const region = createScrollRegion(3);
      const result = scrollUp(lines, 10, region);
      expect(result[0].cells[0].char).toBe(" ");
      expect(result[1].cells[0].char).toBe(" ");
      expect(result[2].cells[0].char).toBe(" ");
    });
  });

  describe("scrollDown", () => {
    it("moves lines down within scroll region", () => {
      const lines = makeLines(5);
      lines[0].cells[0].char = "0";
      lines[1].cells[0].char = "1";
      lines[2].cells[0].char = "2";
      lines[3].cells[0].char = "3";
      lines[4].cells[0].char = "4";

      const region = createScrollRegion(5);
      const result = scrollDown(lines, 1, region);
      // All shift down, line 0 cleared
      expect(result[0].cells[0].char).toBe(" ");
      expect(result[1].cells[0].char).toBe("0");
      expect(result[2].cells[0].char).toBe("1");
      expect(result[3].cells[0].char).toBe("2");
      expect(result[4].cells[0].char).toBe("3");
    });
  });
});
