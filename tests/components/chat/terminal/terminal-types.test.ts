import { describe, expect, it } from "vitest";
import type {
  CursorStyle,
  RgbColor,
  TerminalAttributes,
  TerminalBufferState,
  TerminalCell,
  TerminalColorSpace,
  TerminalEvent,
  TerminalEventType,
  TerminalLine,
  TerminalLineHeight,
  TerminalRendererProps,
} from "../../../../packages/web/src/types/terminal";

describe("terminal type contracts", () => {
  it("constrains TerminalColorSpace to 16color, 256color, truecolor", () => {
    const spaces: TerminalColorSpace[] = ["16color", "256color", "truecolor"];
    expect(spaces).toHaveLength(3);
  });

  it("constrains TerminalEventType to 5 event variants", () => {
    const types: TerminalEventType[] = [
      "bell",
      "resize",
      "alternate-screen-enter",
      "alternate-screen-exit",
      "hyperlink-click",
    ];
    expect(types).toHaveLength(5);
  });

  it("constrains CursorStyle to block, underline, bar", () => {
    const styles: CursorStyle[] = ["block", "underline", "bar"];
    expect(styles).toHaveLength(3);
  });

  it("allows constructing RgbColor", () => {
    const color: RgbColor = { r: 16, g: 185, b: 129 };
    expect(color.r).toBe(16);
    expect(color.g).toBe(185);
    expect(color.b).toBe(129);
  });

  it("allows constructing default TerminalAttributes with all formats disabled", () => {
    const attrs: TerminalAttributes = {
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
    };
    expect(attrs.bold).toBe(false);
    expect(attrs.foreground).toBeNull();
    expect(attrs.background).toBeNull();
    expect(attrs.inverse).toBe(false);
  });

  it("allows constructing TerminalAttributes with foreground and bold", () => {
    const attrs: TerminalAttributes = {
      foreground: { r: 255, g: 0, b: 0 },
      background: null,
      bold: true,
      dim: false,
      italic: false,
      underline: false,
      blink: false,
      inverse: false,
      hidden: false,
      strikethrough: false,
    };
    expect(attrs.bold).toBe(true);
    expect(attrs.foreground).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("allows constructing TerminalAttributes with all format flags enabled", () => {
    const attrs: TerminalAttributes = {
      foreground: { r: 255, g: 255, b: 255 },
      background: { r: 0, g: 0, b: 0 },
      bold: true,
      dim: true,
      italic: true,
      underline: true,
      blink: true,
      inverse: true,
      hidden: true,
      strikethrough: true,
    };
    expect(attrs.bold).toBe(true);
    expect(attrs.dim).toBe(true);
    expect(attrs.italic).toBe(true);
    expect(attrs.underline).toBe(true);
    expect(attrs.blink).toBe(true);
    expect(attrs.inverse).toBe(true);
    expect(attrs.hidden).toBe(true);
    expect(attrs.strikethrough).toBe(true);
  });

  it("allows constructing TerminalCell with single width", () => {
    const cell: TerminalCell = {
      char: "A",
      attributes: {
        foreground: { r: 78, g: 222, b: 163 },
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
      width: 1,
    };
    expect(cell.char).toBe("A");
    expect(cell.width).toBe(1);
    expect(cell.attributes.foreground).toEqual({ r: 78, g: 222, b: 163 });
  });

  it("allows constructing TerminalCell with double width for CJK", () => {
    const cell: TerminalCell = {
      char: "中",
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
      width: 2,
    };
    expect(cell.char).toBe("中");
    expect(cell.width).toBe(2);
  });

  it("allows constructing TerminalLine with wrapped flag", () => {
    const cell: TerminalCell = {
      char: "x",
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
      width: 1,
    };
    const line: TerminalLine = {
      cells: [cell, cell, cell],
      isWrapped: true,
      timestamp: 1718832000000,
    };
    expect(line.cells).toHaveLength(3);
    expect(line.isWrapped).toBe(true);
    expect(line.timestamp).toBe(1718832000000);
  });

  it("allows constructing TerminalBufferState with default values", () => {
    const buffer: TerminalBufferState = {
      lines: [],
      cursorX: 0,
      cursorY: 0,
      cursorVisible: true,
      currentAttributes: {
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
      scrollbackSize: 10000,
      isAlternateScreen: false,
    };
    expect(buffer.lines).toHaveLength(0);
    expect(buffer.cursorX).toBe(0);
    expect(buffer.cursorY).toBe(0);
    expect(buffer.cursorVisible).toBe(true);
    expect(buffer.scrollbackSize).toBe(10000);
    expect(buffer.isAlternateScreen).toBe(false);
  });

  it("allows constructing TerminalBufferState with alternate screen enabled", () => {
    const buffer: TerminalBufferState = {
      lines: [],
      cursorX: 5,
      cursorY: 10,
      cursorVisible: false,
      currentAttributes: {
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
      scrollbackSize: 5000,
      isAlternateScreen: true,
    };
    expect(buffer.isAlternateScreen).toBe(true);
    expect(buffer.cursorX).toBe(5);
    expect(buffer.cursorY).toBe(10);
    expect(buffer.cursorVisible).toBe(false);
    expect(buffer.scrollbackSize).toBe(5000);
  });

  it("allows constructing TerminalEvent with bell type", () => {
    const event: TerminalEvent = {
      type: "bell",
      payload: null,
    };
    expect(event.type).toBe("bell");
  });

  it("allows constructing TerminalEvent with resize type and dimensions payload", () => {
    const event: TerminalEvent = {
      type: "resize",
      payload: { cols: 80, rows: 24 },
    };
    expect(event.type).toBe("resize");
    expect(event.payload).toEqual({ cols: 80, rows: 24 });
  });

  it("allows constructing TerminalEvent for alternate screen enter/exit", () => {
    const enter: TerminalEvent = {
      type: "alternate-screen-enter",
      payload: null,
    };
    const exit: TerminalEvent = {
      type: "alternate-screen-exit",
      payload: { savedLines: 100 },
    };
    expect(enter.type).toBe("alternate-screen-enter");
    expect(exit.type).toBe("alternate-screen-exit");
    expect(exit.payload).toEqual({ savedLines: 100 });
  });

  it("allows constructing TerminalEvent for hyperlink click", () => {
    const event: TerminalEvent = {
      type: "hyperlink-click",
      payload: { url: "https://example.com", text: "example link" },
    };
    expect(event.type).toBe("hyperlink-click");
    expect(event.payload).toEqual({ url: "https://example.com", text: "example link" });
  });

  it("allows constructing TerminalRendererProps with defaults", () => {
    const props: TerminalRendererProps = {
      content: "Hello \x1b[32mWorld\x1b[0m",
      maxLines: 10000,
      fontSize: 13,
      enableBell: true,
      enableBlink: false,
      virtualScrollThreshold: 500,
    };
    expect(props.content).toBe("Hello \x1b[32mWorld\x1b[0m");
    expect(props.maxLines).toBe(10000);
    expect(props.fontSize).toBe(13);
    expect(props.virtualScrollThreshold).toBe(500);
  });

  it("allows constructing TerminalLineHeight", () => {
    const lh: TerminalLineHeight = { fontSize: 13, lineHeight: 15.6 };
    expect(lh.fontSize).toBe(13);
    expect(lh.lineHeight).toBe(15.6);
  });
});
