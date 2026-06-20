import { describe, expect, it, beforeEach } from "vitest";
import { renderTerminal, renderTerminalFromLines } from "../../../../packages/web/src/components/chat/terminal/TerminalRenderer";
import { createTerminalSlice } from "../../../../packages/web/src/store/slices/terminal.slice";
import type { TerminalSlice } from "../../../../packages/web/src/store/slices/terminal.slice";
import type { TerminalLine, TerminalCell } from "../../../../packages/web/src/types/terminal";
import { createTerminalBuffer } from "../../../../packages/web/src/lib/terminal-buffer";
import { createDefaultAttributes } from "../../../../packages/web/src/lib/ansi-parser/sgr";

function cell(char: string): TerminalCell {
  return { char, attributes: createDefaultAttributes(), width: 1 };
}

describe("terminal slice", () => {
  let slice: TerminalSlice;

  beforeEach(() => {
    slice = createTerminalSlice();
  });

  it("creates and retrieves buffers", () => {
    const id = slice.createBuffer("main");
    expect(id).toBe("main");
    const buf = slice.getBuffer("main");
    expect(buf).toBeDefined();
  });

  it("sets first created buffer as current", () => {
    slice.createBuffer("main");
    expect(slice.getCurrentBufferId()).toBe("main");
  });

  it("creates multiple buffers independently", () => {
    slice.createBuffer("buf1");
    slice.createBuffer("buf2");
    expect(slice.getBuffer("buf1")).toBeDefined();
    expect(slice.getBuffer("buf2")).toBeDefined();
    expect(slice.getCurrentBufferId()).toBe("buf1");
  });

  it("destroys buffers and updates current", () => {
    slice.createBuffer("buf1");
    slice.createBuffer("buf2");
    slice.destroyBuffer("buf1");
    expect(slice.getBuffer("buf1")).toBeUndefined();
    expect(slice.getCurrentBufferId()).toBe("buf2");
  });

  it("destroys last buffer and sets current to null", () => {
    slice.createBuffer("only");
    slice.destroyBuffer("only");
    expect(slice.getCurrentBufferId()).toBeNull();
  });

  it("appends text to buffer", () => {
    const id = slice.createBuffer("main");
    slice.appendToBuffer(id, "Hello");
    const buf = slice.getBuffer(id)!;
    expect(buf.getLines()[0].cells[0].char).toBe("H");
  });

  it("manages cursor style", () => {
    expect(slice.getCursorStyle()).toBe("block");
    slice.setCursorStyle("bar");
    expect(slice.getCursorStyle()).toBe("bar");
    slice.setCursorStyle("underline");
    expect(slice.getCursorStyle()).toBe("underline");
  });

  it("manages font size", () => {
    expect(slice.getFontSize()).toBe(13);
    slice.setFontSize(16);
    expect(slice.getFontSize()).toBe(16);
  });

  it("manages feature flags", () => {
    expect(slice.getEnableBell()).toBe(true);
    expect(slice.getEnableBlink()).toBe(false);
    expect(slice.getEnableAlternateScreen()).toBe(true);

    slice.setEnableBell(false);
    slice.setEnableBlink(true);
    slice.setEnableAlternateScreen(false);

    expect(slice.getEnableBell()).toBe(false);
    expect(slice.getEnableBlink()).toBe(true);
    expect(slice.getEnableAlternateScreen()).toBe(false);
  });
});

describe("renderTerminal", () => {
  it("renders plain text content", () => {
    const html = renderTerminal("hello world");
    expect(html).toContain("hello world");
    expect(html).toContain("terminal-renderer");
    expect(html).toContain('role="log"');
  });

  it("renders ANSI colored text", () => {
    const html = renderTerminal("\x1b[31mred text\x1b[0m");
    expect(html).toContain("red text");
    expect(html).toContain("color:#ff5555");
  });

  it("renders empty content as empty terminal", () => {
    const html = renderTerminal("");
    expect(html).toContain('data-terminal-empty="true"');
  });

  it("truncates to maxLines", () => {
    const lines = Array.from({ length: 150 }, (_, i) => `line ${i}`).join("\n");
    const html = renderTerminal(lines, { maxLines: 100 });
    expect(html).toContain("Showing 100 of 150 lines");
    expect(html).toContain('data-terminal-lines="100"');
    expect(html).toContain("line 99");
  });

  it("includes ARIA attributes for accessibility", () => {
    const html = renderTerminal("output");
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-label="Terminal output"');
  });

  it("uses monospace font stack", () => {
    const html = renderTerminal("code");
    expect(html).toContain("Consolas");
    expect(html).toContain("monospace");
  });

  it("includes blink keyframes when enableBlink is true", () => {
    const html = renderTerminal("\x1b[5mblink\x1b[0m", { enableBlink: true });
    expect(html).toContain("terminal-blink");
  });

  it("does not include blink keyframes by default", () => {
    const html = renderTerminal("text");
    expect(html).not.toContain("terminal-blink");
  });
});

describe("renderTerminalFromLines", () => {
  it("renders lines from TerminalLine array", () => {
    const lines: TerminalLine[] = [
      { cells: [cell("a"), cell("b"), cell("c")], isWrapped: false, timestamp: 1 },
    ];
    const html = renderTerminalFromLines(lines);
    expect(html).toContain("abc");
  });

  it("renders multiple lines", () => {
    const lines: TerminalLine[] = [
      { cells: [cell("line1")], isWrapped: false, timestamp: 1 },
      { cells: [cell("line2")], isWrapped: false, timestamp: 2 },
    ];
    const html = renderTerminalFromLines(lines);
    expect(html).toContain("line1");
    expect(html).toContain("line2");
  });

  it("shows truncated notice for excess lines", () => {
    const lines: TerminalLine[] = Array.from({ length: 10 }, (_, i) => ({
      cells: [cell(`line${i}`)],
      isWrapped: false,
      timestamp: i,
    }));
    const html = renderTerminalFromLines(lines, { maxLines: 5 });
    expect(html).toContain("earlier lines");
  });

  it("renders cursor when position provided", () => {
    const lines: TerminalLine[] = [
      { cells: [cell("a"), cell("b")], isWrapped: false, timestamp: 1 },
    ];
    const html = renderTerminalFromLines(lines, { cursorX: 1, cursorY: 0, cursorVisible: true });
    expect(html).toContain("terminal-cursor");
  });

  it("hides cursor when cursorVisible is false", () => {
    const lines: TerminalLine[] = [
      { cells: [cell("x")], isWrapped: false, timestamp: 1 },
    ];
    const html = renderTerminalFromLines(lines, { cursorX: 0, cursorY: 0, cursorVisible: false });
    expect(html).not.toContain("terminal-cursor");
  });

  it("handles empty lines array", () => {
    const html = renderTerminalFromLines([]);
    expect(html).toContain("terminal-renderer");
  });
});
