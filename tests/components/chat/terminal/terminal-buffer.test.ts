import { describe, expect, it, beforeEach } from "vitest";
import { createTerminalBuffer } from "../../../../packages/web/src/lib/terminal-buffer";
import type { TerminalBuffer } from "../../../../packages/web/src/lib/terminal-buffer";
import { createDefaultAttributes } from "../../../../packages/web/src/lib/ansi-parser/sgr";

function fresh(): TerminalBuffer {
  return createTerminalBuffer({ cols: 80, rows: 24, scrollbackSize: 100 });
}

describe("terminal buffer", () => {
  describe("initialization", () => {
    it("creates buffer with default rows", () => {
      const buf = fresh();
      expect(buf.getLines()).toHaveLength(24);
    });

    it("initializes cursor at origin", () => {
      const buf = fresh();
      expect(buf.getCursor()).toEqual({ x: 0, y: 0 });
    });

    it("cursor is visible by default", () => {
      const buf = fresh();
      expect(buf.getCursorVisible()).toBe(true);
    });

    it("has default attributes", () => {
      const buf = fresh();
      const attrs = buf.getCurrentAttributes();
      expect(attrs.bold).toBe(false);
      expect(attrs.foreground).toBeNull();
      expect(attrs.background).toBeNull();
    });
  });

  describe("text output", () => {
    it("writes a single character and advances cursor", () => {
      const buf = fresh();
      buf.writeChar("A");
      expect(buf.getCursor().x).toBe(1);
      const lines = buf.getLines();
      expect(lines[0].cells[0].char).toBe("A");
    });

    it("writes multiple characters in sequence", () => {
      const buf = fresh();
      buf.writeText("Hello");
      expect(buf.getCursor().x).toBe(5);
      const cells = buf.getLines()[0].cells;
      expect(cells[0].char).toBe("H");
      expect(cells[4].char).toBe("o");
    });

    it("newline advances to next row and resets column", () => {
      const buf = fresh();
      buf.writeText("abc");
      buf.writeChar("\n");
      expect(buf.getCursor()).toEqual({ x: 0, y: 1 });
      buf.writeText("def");
      expect(buf.getCursor().x).toBe(3);
    });

    it("carriage return resets column to 0", () => {
      const buf = fresh();
      buf.writeText("abc");
      buf.writeChar("\r");
      expect(buf.getCursor()).toEqual({ x: 0, y: 0 });
      // Writing after \r overwrites at column 0
      buf.writeChar("X");
      expect(buf.getCursor().x).toBe(1);
      expect(buf.getLines()[0].cells[0].char).toBe("X");
    });

    it("tab advances to next 8-column stop", () => {
      const buf = fresh();
      buf.writeChar("\t");
      // Tab from col 0 → col 8
      expect(buf.getCursor().x).toBe(8);
    });

    it("tab from col 5 advances to col 8", () => {
      const buf = fresh();
      buf.writeText("abcde");
      buf.writeChar("\t");
      expect(buf.getCursor().x).toBe(8);
    });

    it("adds new line when writing at bottom", () => {
      const buf = fresh();
      // Fill to bottom
      for (let i = 0; i < 24; i++) {
        buf.writeText("line");
        buf.writeChar("\n");
      }
      const lines = buf.getLines();
      expect(lines.length).toBeGreaterThanOrEqual(24);
    });
  });

  describe("attribute inheritance", () => {
    it("writes cells with current attributes", () => {
      const buf = fresh();
      const attrs = createDefaultAttributes();
      attrs.bold = true;
      attrs.foreground = { r: 255, g: 0, b: 0 };
      buf.applyAttributes(attrs);
      buf.writeChar("A");
      const cell = buf.getLines()[0].cells[0];
      expect(cell.attributes.bold).toBe(true);
      expect(cell.attributes.foreground).toEqual({ r: 255, g: 0, b: 0 });
    });

    it("getCurrentAttributes returns current state", () => {
      const buf = fresh();
      const attrs = buf.getCurrentAttributes();
      attrs.bold = true;
      buf.applyAttributes(attrs);
      expect(buf.getCurrentAttributes().bold).toBe(true);
    });
  });

  describe("cursor control", () => {
    it("cursorUp moves up", () => {
      const buf = fresh();
      buf.writeText("a\nb\nc");
      // cursor at line 2 after the three lines
      buf.cursorUp(2);
      expect(buf.getCursor().y).toBe(0);
    });

    it("cursorDown moves down", () => {
      const buf = fresh();
      buf.cursorDown(5);
      expect(buf.getCursor().y).toBe(5);
    });

    it("cursorForward moves right", () => {
      const buf = fresh();
      buf.cursorForward(10);
      expect(buf.getCursor().x).toBe(10);
    });

    it("cursorBack moves left", () => {
      const buf = fresh();
      buf.writeText("hello");
      buf.cursorBack(3);
      expect(buf.getCursor().x).toBe(2);
    });

    it("cursorSet positions absolutely", () => {
      const buf = fresh();
      buf.cursorSet(5, 10);
      // 1-indexed → 0-indexed
      expect(buf.getCursor()).toEqual({ x: 9, y: 4 });
    });

    it("cursorShow/Hide toggle visibility", () => {
      const buf = fresh();
      buf.cursorHide();
      expect(buf.getCursorVisible()).toBe(false);
      buf.cursorShow();
      expect(buf.getCursorVisible()).toBe(true);
    });

    it("cursorSave and Restore work", () => {
      const buf = fresh();
      buf.writeText("hello world");
      buf.cursorSave();
      buf.cursorSet(1, 1);
      buf.cursorRestore();
      expect(buf.getCursor().x).toBe(11);
    });
  });

  describe("alternate screen", () => {
    it("enters and exits alternate screen", () => {
      const buf = fresh();
      buf.writeText("main content");
      expect(buf.isAlternateScreen()).toBe(false);

      buf.enterAlternateScreen();
      expect(buf.isAlternateScreen()).toBe(true);
      // Alt screen starts fresh
      const altLines = buf.getLines();
      expect(altLines).toHaveLength(24);

      const result = buf.exitAlternateScreen();
      expect(result).toBe(true);
      expect(buf.isAlternateScreen()).toBe(false);
      // Main content restored
      const mainLines = buf.getLines();
      expect(mainLines[0].cells[0].char).toBe("m");
    });

    it("exitAlternateScreen returns false if not in alternate", () => {
      const buf = fresh();
      expect(buf.exitAlternateScreen()).toBe(false);
    });

    it("emits events on enter/exit", () => {
      const buf = fresh();
      buf.enterAlternateScreen();
      const events = buf.getEvents();
      expect(events.some((e) => e.type === "alternate-screen-enter")).toBe(true);

      buf.clearEvents();
      buf.exitAlternateScreen();
      const events2 = buf.getEvents();
      expect(events2.some((e) => e.type === "alternate-screen-exit")).toBe(true);
    });
  });

  describe("event emission", () => {
    it("emits bell event", () => {
      const buf = fresh();
      buf.emitEvent("bell", null);
      expect(buf.getEvents()).toHaveLength(1);
      expect(buf.getEvents()[0].type).toBe("bell");
    });

    it("clearEvents clears stored events", () => {
      const buf = fresh();
      buf.emitEvent("bell", null);
      buf.clearEvents();
      expect(buf.getEvents()).toHaveLength(0);
    });
  });

  describe("scrollback trimming", () => {
    it("trims old lines beyond scrollback limit", () => {
      const buf = createTerminalBuffer({ cols: 80, rows: 5, scrollbackSize: 10 });
      // Write lots of lines
      for (let i = 0; i < 50; i++) {
        buf.writeText(`line ${i}`);
        buf.writeChar("\n");
      }
      // Lines should be trimmed to scrollback + rows
      expect(buf.getLines().length).toBeLessThanOrEqual(15);
    });
  });
});
