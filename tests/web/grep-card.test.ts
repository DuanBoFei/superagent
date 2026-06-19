import { describe, expect, it } from "vitest";
import { renderGrepCard } from "../../packages/web/src/components/chat/cards/GrepCard";
import type { GrepCard, GrepMatch } from "../../packages/web/src/types/cards";

const match: GrepMatch = { filePath: "src/foo.ts", line: 42, column: 5, matchText: "function", contextBefore: "  ", contextAfter: " parse() {" };

function card(overrides: Partial<GrepCard> = {}): GrepCard {
  return {
    id: "g1", type: "grep", status: "success", timestamp: 1_720_000_000_000,
    title: "Grep: function", isExpanded: true, isCollapsible: true,
    content: { pattern: "function", matches: [match], totalMatches: 1, filesSearched: 3 },
    ...overrides,
  } as GrepCard;
}

describe("renderGrepCard", () => {
  it("shows pattern and match statistics", () => {
    const html = renderGrepCard(card());
    expect(html).toContain("function");
    expect(html).toContain("1 match");
    expect(html).toContain("3 files");
  });

  it("shows file path and match text for each result", () => {
    const html = renderGrepCard(card());
    expect(html).toContain("src/foo.ts");
    expect(html).toContain("function");
    expect(html).toContain("42"); // line number
  });

  it("groups matches by file", () => {
    const m1: GrepMatch = { filePath: "a.ts", line: 1, column: 1, matchText: "x", contextBefore: "", contextAfter: "" };
    const m2: GrepMatch = { filePath: "a.ts", line: 5, column: 1, matchText: "y", contextBefore: "", contextAfter: "" };
    const html = renderGrepCard(card({ content: { pattern: "x", matches: [m1, m2], totalMatches: 2, filesSearched: 2 } }));
    // Both matches under same file
    expect(html).toContain("a.ts");
    expect(html).toContain("1"); // line
    expect(html).toContain("5"); // line
  });

  it("collapses when > 20 matches", () => {
    const matches = Array.from({ length: 25 }, (_, i): GrepMatch => ({
      filePath: `file${i}.ts`, line: i + 1, column: 1, matchText: "m", contextBefore: "", contextAfter: "",
    }));
    const html = renderGrepCard(card({ content: { pattern: "m", matches, totalMatches: 25, filesSearched: 25 } }));
    expect(html).toContain("grep-collapsed");
  });
});
