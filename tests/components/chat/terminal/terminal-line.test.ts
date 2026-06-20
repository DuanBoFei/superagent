import { describe, expect, it } from "vitest";
import { renderTerminalLine } from "../../../../packages/web/src/components/chat/terminal/TerminalLine";
import type { TerminalLine, TerminalCell, TerminalAttributes } from "../../../../packages/web/src/types/terminal";
import { createDefaultAttributes } from "../../../../packages/web/src/lib/ansi-parser/sgr";

function defaultAttrs(): TerminalAttributes {
  return createDefaultAttributes();
}

function cell(char: string, overrides: Partial<TerminalAttributes> = {}): TerminalCell {
  return {
    char,
    attributes: { ...defaultAttrs(), ...overrides },
    width: 1,
  };
}

function line(cells: TerminalCell[], isWrapped = false): TerminalLine {
  return { cells, isWrapped, timestamp: Date.now() };
}

describe("renderTerminalLine", () => {
  it("renders plain text as single span", () => {
    const html = renderTerminalLine(line([cell("H"), cell("i")]));
    expect(html).toContain("H");
    expect(html).toContain("i");
  });

  it("groups consecutive cells with identical attributes", () => {
    const attrs = { bold: true };
    const html = renderTerminalLine(line([
      cell("A", attrs),
      cell("B", attrs),
      cell("C", attrs),
    ]));
    // One wrapper span + one content span for grouped "ABC"
    // (not 3 separate content spans)
    const spanMatches = html.match(/<span/g);
    expect(spanMatches).not.toBeNull();
    expect(spanMatches!.length).toBe(2);
    expect(html).toContain("ABC");
  });

  it("splits spans when attributes change", () => {
    const html = renderTerminalLine(line([
      cell("A", { bold: true }),
      cell("B"),
      cell("C", { bold: true }),
    ]));
    // 1 wrapper + 2 content spans (bold A, bold C). Plain B is unwrapped.
    const spanMatches = html.match(/<span/g);
    expect(spanMatches).not.toBeNull();
    expect(spanMatches!.length).toBe(3);
  });

  it("renders foreground color", () => {
    const html = renderTerminalLine(line([
      cell("X", { foreground: { r: 255, g: 0, b: 0 } }),
    ]));
    expect(html).toContain("color:#ff0000");
    expect(html).toContain("X");
  });

  it("renders background color", () => {
    const html = renderTerminalLine(line([
      cell("Y", { background: { r: 0, g: 0, b: 255 } }),
    ]));
    expect(html).toContain("background-color:#0000ff");
  });

  it("renders bold as font-weight:700", () => {
    const html = renderTerminalLine(line([
      cell("bold", { bold: true }),
    ]));
    expect(html).toContain("font-weight:700");
  });

  it("renders dim as opacity:0.7", () => {
    const html = renderTerminalLine(line([
      cell("dim", { dim: true }),
    ]));
    expect(html).toContain("opacity:0.7");
  });

  it("renders italic as font-style:italic", () => {
    const html = renderTerminalLine(line([
      cell("italic", { italic: true }),
    ]));
    expect(html).toContain("font-style:italic");
  });

  it("renders underline", () => {
    const html = renderTerminalLine(line([
      cell("ul", { underline: true }),
    ]));
    expect(html).toContain("text-decoration:underline");
  });

  it("renders strikethrough", () => {
    const html = renderTerminalLine(line([
      cell("strike", { strikethrough: true }),
    ]));
    expect(html).toContain("text-decoration:line-through");
  });

  it("combines underline and strikethrough", () => {
    const html = renderTerminalLine(line([
      cell("both", { underline: true, strikethrough: true }),
    ]));
    expect(html).toContain("text-decoration:underline line-through");
  });

  it("renders hidden as visibility:hidden", () => {
    const html = renderTerminalLine(line([
      cell("ghost", { hidden: true }),
    ]));
    expect(html).toContain("visibility:hidden");
  });

  it("renders blink as CSS animation when enabled", () => {
    const html = renderTerminalLine(line([
      cell("blink", { blink: true }),
    ]), { enableBlink: true });
    expect(html).toContain("blink");
    expect(html).toContain("animation");
  });

  it("does not render blink animation when disabled (default)", () => {
    const html = renderTerminalLine(line([
      cell("blink", { blink: true }),
    ]));
    expect(html).not.toContain("animation");
  });

  it("swaps foreground/background on inverse", () => {
    const html = renderTerminalLine(line([
      cell("inv", {
        foreground: { r: 255, g: 0, b: 0 },
        background: { r: 0, g: 0, b: 255 },
        inverse: true,
      }),
    ]));
    // Foreground red becomes background, background blue becomes foreground
    expect(html).toContain("color:#0000ff");
    expect(html).toContain("background-color:#ff0000");
  });

  it("escapes HTML in cell characters", () => {
    const html = renderTerminalLine(line([
      cell("<script>"),
    ]));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("wraps cells with no style attributes in plain text (no extra span)", () => {
    const html = renderTerminalLine(line([
      cell("plain"),
    ]));
    // Content is plain text inside the wrapper (no additional inner span)
    expect(html).toContain("plain");
    // Only the wrapper span, no inner content spans
    expect(html.match(/<span/g)!.length).toBe(1);
  });

  it("handles empty line", () => {
    const html = renderTerminalLine(line([]));
    expect(html).toBe("");
  });

  it("renders CJK characters without escaping", () => {
    const html = renderTerminalLine(line([
      cell("你好"),
      cell("世界"),
    ]));
    expect(html).toContain("你好世界");
  });

  it("uses monospace font class", () => {
    const html = renderTerminalLine(line([cell("test")]));
    expect(html).toContain("terminal-line");
  });

  it("handles cells with double width", () => {
    const html = renderTerminalLine(line([
      { char: "😀", attributes: defaultAttrs(), width: 2 },
    ]));
    expect(html).toContain("😀");
  });

  it("groups mixed CJK and ASCII cells correctly", () => {
    const html = renderTerminalLine(line([
      cell("文件:"),
      cell(" "),
      cell("readme.md"),
    ]));
    expect(html).toContain("文件:");
    expect(html).toContain("readme.md");
  });

  it("renders null foreground/background as no color (unset)", () => {
    const attrs = defaultAttrs();
    attrs.foreground = null;
    attrs.background = null;
    const html = renderTerminalLine(line([cell("default", attrs)]));
    expect(html).not.toContain("color:");
    expect(html).not.toContain("background-color:");
  });
});
