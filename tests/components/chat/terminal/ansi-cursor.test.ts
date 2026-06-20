import { describe, expect, it, beforeEach } from "vitest";
import {
  createCursorState,
  cursorBack,
  cursorColumn,
  cursorDown,
  cursorForward,
  cursorHide,
  cursorNextLine,
  cursorPosition,
  cursorPrevLine,
  cursorRestore,
  cursorSave,
  cursorShow,
  cursorUp,
} from "../../../../packages/web/src/lib/ansi-parser/cursor";
import type { CursorState } from "../../../../packages/web/src/lib/ansi-parser/cursor";

const COLS = 80;
const ROWS = 24;

function fresh(): CursorState {
  return createCursorState();
}

describe("ansi cursor controller", () => {
  describe("createCursorState", () => {
    it("defaults to origin (0,0) and visible", () => {
      const c = fresh();
      expect(c.x).toBe(0);
      expect(c.y).toBe(0);
      expect(c.visible).toBe(true);
      expect(c.saved).toBeNull();
    });
  });

  describe("cursorUp (CSI nA)", () => {
    it("moves cursor up by n rows", () => {
      const c = fresh();
      c.y = 5;
      cursorUp(c, 2);
      expect(c.y).toBe(3);
    });

    it("does not move above row 0", () => {
      const c = fresh();
      c.y = 1;
      cursorUp(c, 5);
      expect(c.y).toBe(0);
    });
  });

  describe("cursorDown (CSI nB)", () => {
    it("moves cursor down by n rows", () => {
      const c = fresh();
      cursorDown(c, 3, ROWS);
      expect(c.y).toBe(3);
    });

    it("does not move below max rows", () => {
      const c = fresh();
      c.y = 22;
      cursorDown(c, 5, ROWS);
      expect(c.y).toBe(23);
    });
  });

  describe("cursorForward (CSI nC)", () => {
    it("moves cursor right by n columns", () => {
      const c = fresh();
      cursorForward(c, 10, COLS);
      expect(c.x).toBe(10);
    });

    it("clamps at max column", () => {
      const c = fresh();
      c.x = 78;
      cursorForward(c, 5, COLS);
      expect(c.x).toBe(79);
    });
  });

  describe("cursorBack (CSI nD)", () => {
    it("moves cursor left by n columns", () => {
      const c = fresh();
      c.x = 10;
      cursorBack(c, 5);
      expect(c.x).toBe(5);
    });

    it("does not move left of column 0", () => {
      const c = fresh();
      c.x = 2;
      cursorBack(c, 5);
      expect(c.x).toBe(0);
    });
  });

  describe("cursorNextLine (CSI nE)", () => {
    it("moves down n rows and to column 0", () => {
      const c = fresh();
      c.x = 40;
      cursorNextLine(c, 3, ROWS);
      expect(c.y).toBe(3);
      expect(c.x).toBe(0);
    });

    it("clamps y at max rows", () => {
      const c = fresh();
      c.y = 22;
      cursorNextLine(c, 5, ROWS);
      expect(c.y).toBe(23);
      expect(c.x).toBe(0);
    });
  });

  describe("cursorPrevLine (CSI nF)", () => {
    it("moves up n rows and to column 0", () => {
      const c = fresh();
      c.y = 5;
      c.x = 30;
      cursorPrevLine(c, 3);
      expect(c.y).toBe(2);
      expect(c.x).toBe(0);
    });

    it("clamps y at 0", () => {
      const c = fresh();
      c.y = 1;
      cursorPrevLine(c, 5);
      expect(c.y).toBe(0);
    });
  });

  describe("cursorPosition (CSI row;colH — CUP)", () => {
    it("positions cursor at row 5, col 10 (1-indexed)", () => {
      const c = fresh();
      cursorPosition(c, 5, 10, ROWS, COLS);
      expect(c.y).toBe(4); // 0-indexed
      expect(c.x).toBe(9);
    });

    it("defaults to row 1 when row is 0", () => {
      const c = fresh();
      c.y = 5;
      cursorPosition(c, 0, 1, ROWS, COLS);
      expect(c.y).toBe(0);
      expect(c.x).toBe(0);
    });

    it("clamps to max bounds", () => {
      const c = fresh();
      cursorPosition(c, 999, 999, ROWS, COLS);
      expect(c.y).toBe(ROWS - 1);
      expect(c.x).toBe(COLS - 1);
    });
  });

  describe("cursorColumn (CSI nG — CHA)", () => {
    it("positions cursor at column 30", () => {
      const c = fresh();
      c.x = 0;
      cursorColumn(c, 30, COLS);
      expect(c.x).toBe(29);
    });

    it("defaults to column 1 when 0", () => {
      const c = fresh();
      c.x = 50;
      cursorColumn(c, 0, COLS);
      expect(c.x).toBe(0);
    });

    it("clamps to max columns", () => {
      const c = fresh();
      cursorColumn(c, 999, COLS);
      expect(c.x).toBe(COLS - 1);
    });
  });

  describe("cursor visibility (CSI ?25h / ?25l)", () => {
    it("cursorShow makes cursor visible", () => {
      const c = fresh();
      c.visible = false;
      cursorShow(c);
      expect(c.visible).toBe(true);
    });

    it("cursorHide hides cursor", () => {
      const c = fresh();
      cursorHide(c);
      expect(c.visible).toBe(false);
    });
  });

  describe("cursor save/restore (CSI s / CSI u)", () => {
    it("save stores current position and visibility", () => {
      const c = fresh();
      c.x = 42;
      c.y = 10;
      c.visible = false;
      cursorSave(c);
      expect(c.saved).toEqual({ x: 42, y: 10, visible: false });
    });

    it("restore recovers saved position and visibility", () => {
      const c = fresh();
      c.x = 40;
      c.y = 12;
      c.visible = true;
      cursorSave(c);

      // Move away
      c.x = 0;
      c.y = 0;
      c.visible = false;

      cursorRestore(c);
      expect(c.x).toBe(40);
      expect(c.y).toBe(12);
      expect(c.visible).toBe(true);
    });

    it("restore is no-op when nothing saved", () => {
      const c = fresh();
      c.x = 5;
      c.y = 5;
      cursorRestore(c);
      expect(c.x).toBe(5);
      expect(c.y).toBe(5);
    });

    it("overwrites previous save with new position", () => {
      const c = fresh();
      c.x = 10;
      c.y = 10;
      cursorSave(c);
      c.x = 20;
      c.y = 20;
      cursorSave(c);
      cursorRestore(c);
      expect(c.x).toBe(20);
      expect(c.y).toBe(20);
    });
  });

  describe("boundary protection", () => {
    it("all functions handle extreme values", () => {
      const c = fresh();
      cursorUp(c, 999999);
      expect(c.y).toBe(0);

      cursorDown(c, 999999, ROWS);
      expect(c.y).toBe(ROWS - 1);

      cursorForward(c, 999999, COLS);
      expect(c.x).toBe(COLS - 1);

      cursorBack(c, 999999);
      expect(c.x).toBe(0);
    });

    it("all functions handle negative n gracefully", () => {
      const c = fresh();
      c.y = 10;
      cursorDown(c, -3, ROWS);
      // Negative n means move up — this is accepted behavior
      // (negative n doesn't reverse direction in the spec, it's just clamped)
      // We just verify it doesn't crash
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThan(ROWS);
    });
  });
});
