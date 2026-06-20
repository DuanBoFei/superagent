import { describe, expect, it } from "vitest";
import { renderAlternateScreenBanner } from "../../../../packages/web/src/components/chat/terminal/AlternateScreenBanner";
import type { TerminalLine } from "../../../../packages/web/src/types/terminal";
import { createDefaultAttributes } from "../../../../packages/web/src/lib/ansi-parser/sgr";

function cell(char: string) {
  return { char, attributes: createDefaultAttributes(), width: 1 as const };
}

function line(text: string): TerminalLine {
  return { cells: text.split("").map(cell), isWrapped: false, timestamp: 1 };
}

describe("renderAlternateScreenBanner", () => {
  it("returns empty string when no saved lines", () => {
    const html = renderAlternateScreenBanner([]);
    expect(html).toBe("");
  });

  it("renders collapsed banner with line count", () => {
    const html = renderAlternateScreenBanner([line("hello"), line("world")]);
    expect(html).toContain("alternate-screen-banner");
    expect(html).toContain("2 lines");
    expect(html).toContain("data-collapsed=\"true\"");
  });

  it("shows expand button", () => {
    const html = renderAlternateScreenBanner([line("content")]);
    expect(html).toContain("Show full-screen output");
  });

  it("contains the saved content hidden", () => {
    const html = renderAlternateScreenBanner([line("secret")]);
    expect(html).toContain("secret");
    expect(html).toContain("alternate-screen-content");
  });

  it("renders multiple lines of saved content", () => {
    const saved = [
      line("line1"),
      line("line2"),
      line("line3"),
    ];
    const html = renderAlternateScreenBanner(saved);
    expect(html).toContain("line1");
    expect(html).toContain("line2");
    expect(html).toContain("line3");
    expect(html).toContain("3 lines");
  });

  it("has accessible role", () => {
    const html = renderAlternateScreenBanner([line("x")]);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Saved full-screen output"');
  });
});
