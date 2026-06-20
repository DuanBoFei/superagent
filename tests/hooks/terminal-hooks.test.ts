import { describe, expect, it, beforeEach } from "vitest";
import { useTerminalBuffer } from "../../packages/web/src/hooks/use-terminal-buffer";
import { useTerminalParser } from "../../packages/web/src/hooks/use-terminal-parser";
import { createTerminalSlice } from "../../packages/web/src/store/slices/terminal.slice";
import type { TerminalSlice } from "../../packages/web/src/store/slices/terminal.slice";
import { createTerminalBuffer } from "../../packages/web/src/lib/terminal-buffer";

describe("useTerminalBuffer", () => {
  let slice: TerminalSlice;

  beforeEach(() => {
    slice = createTerminalSlice();
  });

  it("creates and retrieves a buffer handle", () => {
    const handle = useTerminalBuffer(slice, "test");
    expect(handle.id).toBe("test");
    expect(handle.getLines()).toBeDefined();
  });

  it("writes text to buffer", () => {
    const handle = useTerminalBuffer(slice, "test");
    handle.write("Hello");
    const lines = handle.getLines();
    expect(lines[0].cells[0].char).toBe("H");
  });

  it("reports alternate screen status", () => {
    const handle = useTerminalBuffer(slice, "test");
    expect(handle.isAlternateScreen()).toBe(false);
    handle.buffer.enterAlternateScreen();
    expect(handle.isAlternateScreen()).toBe(true);
  });

  it("reports cursor position", () => {
    const handle = useTerminalBuffer(slice, "test");
    expect(handle.getCursor()).toEqual({ x: 0, y: 0 });
    handle.write("abc");
    expect(handle.getCursor().x).toBe(3);
  });

  it("destroys buffer", () => {
    const handle = useTerminalBuffer(slice, "test");
    handle.destroy();
    expect(slice.getBuffer("test")).toBeUndefined();
  });
});

describe("useTerminalParser", () => {
  it("feeds plain text to buffer", () => {
    const buf = createTerminalBuffer();
    const parser = useTerminalParser(buf);
    parser.append("test");
    expect(buf.getLines()[0].cells[0].char).toBe("t");
    expect(buf.getLines()[0].cells[3].char).toBe("t");
  });

  it("strips HTML from ANSI-parsed output before buffer write", () => {
    const buf = createTerminalBuffer();
    const parser = useTerminalParser(buf);
    // ANSI red text is parsed to HTML, but buffer gets plain text
    parser.append("\x1b[31mERROR\x1b[0m");
    const line = buf.getLines()[0];
    const chars = line.cells.map(c => c.char).join("");
    expect(chars).toContain("ERROR");
  });

  it("flushes pending parser state", () => {
    const buf = createTerminalBuffer();
    const parser = useTerminalParser(buf);
    parser.append("hello");
    parser.flush();
    // Buffer should have content
    expect(buf.getLines()[0].cells.length).toBeGreaterThan(0);
  });

  it("resets parser and buffer", () => {
    const buf = createTerminalBuffer();
    const parser = useTerminalParser(buf);
    parser.append("data");
    parser.reset();
    // After reset, buffer should be clean
    expect(buf.getLines()[0].cells.length).toBe(0);
    expect(buf.getCursor()).toEqual({ x: 0, y: 0 });
  });

  it("returns the buffer reference", () => {
    const buf = createTerminalBuffer();
    const parser = useTerminalParser(buf);
    expect(parser.getBuffer()).toBe(buf);
  });
});
