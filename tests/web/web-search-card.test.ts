import { describe, expect, it } from "vitest";
import { renderWebSearchCard } from "../../packages/web/src/components/chat/cards/WebSearchCard";
import type { WebSearchCard } from "../../packages/web/src/types/cards";

function card(overrides: Partial<WebSearchCard> = {}): WebSearchCard {
  return {
    id: "ws1", type: "web-search", status: "success", timestamp: 1_720_000_000_000,
    title: "Web search: TypeScript generics", isExpanded: true, isCollapsible: true,
    content: {
      query: "TypeScript generics",
      results: [
        { title: "TypeScript Generics Guide", url: "https://example.com/ts-generics", snippet: "Learn about generics in TypeScript...", source: "example.com" },
        { title: "Advanced Generic Types", url: "https://example.com/advanced", snippet: "Deep dive into advanced patterns", source: "example.com" },
      ],
      totalResults: 2,
    },
    ...overrides,
  } as WebSearchCard;
}

describe("renderWebSearchCard", () => {
  it("displays search query and result count", () => {
    const html = renderWebSearchCard(card());
    expect(html).toContain("TypeScript generics");
    expect(html).toContain("2 results");
  });

  it("renders result titles as links with target=_blank", () => {
    const html = renderWebSearchCard(card());
    expect(html).toContain("TypeScript Generics Guide");
    expect(html).toContain('target="_blank"');
    expect(html).toContain("https://example.com/ts-generics");
  });

  it("shows source domain and snippet", () => {
    const html = renderWebSearchCard(card());
    expect(html).toContain("example.com");
    expect(html).toContain("Learn about generics");
  });

  it("collapses when > 5 results", () => {
    const results = Array.from({ length: 8 }, (_, i) => ({
      title: `Result ${i}`, url: `https://ex.com/${i}`, snippet: `Snippet ${i}`, source: `ex.com`,
    }));
    const html = renderWebSearchCard(card({ content: { query: "test", results, totalResults: 8 } }));
    expect(html).toContain("search-collapsed");
    expect(html).toContain("Show all 8 results");
  });
});
