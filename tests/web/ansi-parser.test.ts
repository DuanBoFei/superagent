import { describe, expect, it } from "vitest";
import { parseAnsiToHtml, createAnsiParser } from "../../packages/web/src/lib/ansi-parser";

describe("parseAnsiToHtml", () => {
  it("returns plain text unchanged when there are no ANSI sequences", () => {
    const html = parseAnsiToHtml("hello world");
    expect(html).toBe("hello world");
  });

  it("converts bold (1) ANSI code to <strong>", () => {
    const html = parseAnsiToHtml("\x1b[1mbold\x1b[0m");
    expect(html).toContain("font-weight:bold");
    expect(html).toContain("bold");
  });

  it("converts underline (4) ANSI code", () => {
    const html = parseAnsiToHtml("\x1b[4munderlined\x1b[0m");
    expect(html).toContain("text-decoration:underline");
    expect(html).toContain("underlined");
  });

  it("converts reverse/inverse (7) ANSI code", () => {
    const html = parseAnsiToHtml("\x1b[7minverted\x1b[0m");
    // reverse video should swap fg/bg or use a specific CSS approach
    expect(html).toContain("inverted");
  });

  it("handles standard 16 foreground colors (30-37, 90-97)", () => {
    // Red (31)
    const html = parseAnsiToHtml("\x1b[31mred text\x1b[0m");
    expect(html).toContain("color:#");
    expect(html).toContain("red text");

    // Bright red (91)
    const html2 = parseAnsiToHtml("\x1b[91mbright red\x1b[0m");
    expect(html2).toContain("color:#");
    expect(html2).toContain("bright red");
  });

  it("handles standard 16 background colors (40-47, 100-107)", () => {
    const html = parseAnsiToHtml("\x1b[44mblue bg\x1b[0m");
    expect(html).toContain("background-color:#");
    expect(html).toContain("blue bg");
  });

  it("handles 256-color palette (38;5;N)", () => {
    const html = parseAnsiToHtml("\x1b[38;5;196mred 256\x1b[0m");
    expect(html).toContain("color:#");
    expect(html).toContain("red 256");
  });

  it("handles 256-color background (48;5;N)", () => {
    const html = parseAnsiToHtml("\x1b[48;5;27mblue bg 256\x1b[0m");
    expect(html).toContain("background-color:#");
    expect(html).toContain("blue bg 256");
  });

  it("handles true color / 24-bit sequences (38;2;R;G;B)", () => {
    const html = parseAnsiToHtml("\x1b[38;2;255;128;0morange 24-bit\x1b[0m");
    expect(html).toContain("color:#ff8000");
    expect(html).toContain("orange 24-bit");
  });

  it("handles 24-bit background (48;2;R;G;B)", () => {
    const html = parseAnsiToHtml("\x1b[48;2;0;128;0mgreen bg 24-bit\x1b[0m");
    expect(html).toContain("background-color:#008000");
    expect(html).toContain("green bg 24-bit");
  });

  it("combines multiple formatting codes", () => {
    const html = parseAnsiToHtml("\x1b[1;4;31mbold underlined red\x1b[0m");
    expect(html).toContain("font-weight:bold");
    expect(html).toContain("text-decoration:underline");
    expect(html).toContain("color:#");
    expect(html).toContain("bold underlined red");
  });

  it("safely ignores unrecognized escape sequences", () => {
    const html = parseAnsiToHtml("\x1b[999mstill here\x1b[0m");
    expect(html).toContain("still here");
  });

  it("handles consecutive styled spans", () => {
    const html = parseAnsiToHtml("\x1b[31mred\x1b[0m normal \x1b[32mgreen\x1b[0m");
    expect(html).toContain("red");
    expect(html).toContain("normal");
    expect(html).toContain("green");
  });

  it("escapes HTML in input text", () => {
    const html = parseAnsiToHtml("\x1b[31m<script>\x1b[0m");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("handles dim/faint (2) ANSI code", () => {
    const html = parseAnsiToHtml("\x1b[2mdim text\x1b[0m");
    expect(html).toContain("opacity:0.7");
    expect(html).toContain("dim text");
  });

  it("handles empty input", () => {
    expect(parseAnsiToHtml("")).toBe("");
  });

  it("closes open spans at end of input", () => {
    const html = parseAnsiToHtml("\x1b[31mno reset");
    // Should close the span
    const openCount = (html.match(/<span/g) || []).length;
    const closeCount = (html.match(/<\/span>/g) || []).length;
    expect(openCount).toBe(closeCount);
  });
});

describe("createAnsiParser (incremental)", () => {
  it("returns incremental HTML for appended chunks", () => {
    const parser = createAnsiParser();
    const chunk1 = parser.append("\x1b[31mhel");
    expect(chunk1).toContain("hel");

    const chunk2 = parser.append("lo\x1b[0m");
    expect(chunk2).toContain("lo");
    // The reset should close the span
    expect(chunk2).toContain("</span>");
  });

  it("handles streaming across escape sequence boundaries", () => {
    const parser = createAnsiParser();

    // First chunk has partial escape: just "\x1b[3"
    const chunk1 = parser.append("pre \x1b[3");
    expect(chunk1).toBe("pre ");

    // Second chunk completes it: "1mred\x1b[0m"
    const chunk2 = parser.append("1mred\x1b[0m after");
    expect(chunk2).toContain("color:#");
    expect(chunk2).toContain("red");
    expect(chunk2).toContain("after");
  });

  it("reset() clears internal state", () => {
    const parser = createAnsiParser();
    parser.append("\x1b[31m");
    parser.reset();
    const result = parser.append("fresh");
    expect(result).toBe("fresh");
  });

  it("handles multi-byte UTF-8 characters", () => {
    const parser = createAnsiParser();
    const result = parser.append("\x1b[32m中文\x1b[0m");
    expect(result).toContain("中文");
  });
});
