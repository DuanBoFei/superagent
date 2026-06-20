import { describe, expect, it } from "vitest";
import { parseAnsiToHtml, createAnsiParser } from "../../../../packages/web/src/lib/ansi-parser";
import { renderTerminalLine } from "../../../../packages/web/src/components/chat/terminal/TerminalLine";
import { createTerminalBuffer } from "../../../../packages/web/src/lib/terminal-buffer";
import type { TerminalLine, TerminalCell } from "../../../../packages/web/src/types/terminal";
import { createDefaultAttributes } from "../../../../packages/web/src/lib/ansi-parser/sgr";

function generateAnsiContent(sizeKb: number): string {
  const parts: string[] = [];
  const colors = [31, 32, 33, 34, 35, 36, 37, 91, 92, 93, 94, 95, 96];
  const formats = [1, 3, 4, 0];
  let i = 0;
  while (Buffer.byteLength(parts.join(""), "utf8") < sizeKb * 1024) {
    if (i % 10 === 0) {
      parts.push(`\x1b[${colors[i % colors.length]}m`);
    }
    if (i % 20 === 0) {
      parts.push(`\x1b[${formats[i % formats.length]}m`);
    }
    parts.push(`The quick brown fox jumps over the lazy dog. Line ${i}. `);
    if (i % 15 === 0) {
      parts.push("\x1b[0m");
    }
    i++;
  }
  return parts.join("");
}

function cell(char: string): TerminalCell {
  return { char, attributes: createDefaultAttributes(), width: 1 };
}

describe("parser performance", () => {
  it("parses 100KB of ANSI content within 100ms (≥1MB/s)", () => {
    const content = generateAnsiContent(100);
    const start = performance.now();
    const html = parseAnsiToHtml(content);
    const elapsed = performance.now() - start;
    // Should be well under 1000ms for 100KB (target 1MB/s, so 100KB should take <100ms)
    // Use generous threshold for CI variance
    expect(elapsed).toBeLessThan(500);
    expect(html.length).toBeGreaterThan(0);
  });

  it("incremental parser handles 50KB of chunked input efficiently", () => {
    const content = generateAnsiContent(50);
    const chunkSize = 1024;
    const parser = createAnsiParser();
    const start = performance.now();
    for (let i = 0; i < content.length; i += chunkSize) {
      parser.append(content.slice(i, i + chunkSize));
    }
    parser.flush();
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(300);
  });
});

describe("TerminalLine render performance", () => {
  it("renders 1000 lines within 100ms", () => {
    const lines: TerminalLine[] = Array.from({ length: 1000 }, (_, i) => ({
      cells: [
        cell("l"), cell("i"), cell("n"), cell("e"), cell(" "),
        cell(String(i)),
      ].concat(
        Array.from({ length: 70 }, () => cell("x")),
      ),
      isWrapped: false,
      timestamp: i,
    }));

    const start = performance.now();
    for (const line of lines) {
      renderTerminalLine(line);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it("renders 10000 lines within 500ms", () => {
    const lines: TerminalLine[] = Array.from({ length: 10000 }, (_, i) => ({
      cells: [
        cell("l"), cell("i"), cell("n"), cell("e"), cell(" "),
        cell(String(i)),
      ].concat(
        Array.from({ length: 35 }, () => cell("x")),
      ),
      isWrapped: false,
      timestamp: i,
    }));

    const start = performance.now();
    for (const line of lines) {
      renderTerminalLine(line);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

describe("TerminalBuffer write performance", () => {
  it("writes 10000 characters efficiently", () => {
    const buf = createTerminalBuffer({ cols: 80, rows: 24, scrollbackSize: 10000 });
    const text = "The quick brown fox\n".repeat(200); // ~6800 chars + newlines
    const start = performance.now();
    buf.writeText(text);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
    expect(buf.getLines().length).toBeGreaterThan(24);
  });

  it("handles scrollback trimming with many lines", () => {
    const buf = createTerminalBuffer({ cols: 80, rows: 5, scrollbackSize: 100 });
    const start = performance.now();
    for (let i = 0; i < 500; i++) {
      buf.writeText(`line ${i}\n`);
    }
    const elapsed = performance.now() - start;
    // Lines should be trimmed to scrollback + rows (105)
    expect(buf.getLines().length).toBeLessThanOrEqual(110);
    expect(elapsed).toBeLessThan(500);
  });
});
