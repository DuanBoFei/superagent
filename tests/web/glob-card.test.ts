import { describe, expect, it } from "vitest";
import { renderGlobCard } from "../../packages/web/src/components/chat/cards/GlobCard";
import type { GlobCard } from "../../packages/web/src/types/cards";

function card(overrides: Partial<GlobCard> = {}): GlobCard {
  return {
    id: "g1", type: "glob", status: "success", timestamp: 1_720_000_000_000,
    title: "Glob: src/**/*.ts", isExpanded: true, isCollapsible: true,
    content: { pattern: "src/**/*.ts", files: ["src/foo.ts", "src/bar.ts", "src/utils/index.ts"], totalFiles: 3 },
    ...overrides,
  } as GlobCard;
}

describe("renderGlobCard", () => {
  it("displays pattern and file count", () => {
    const html = renderGlobCard(card());
    expect(html).toContain("src/**/*.ts");
    expect(html).toContain("3 files");
  });

  it("lists matched file paths", () => {
    const html = renderGlobCard(card());
    expect(html).toContain("src/foo.ts");
    expect(html).toContain("src/bar.ts");
    expect(html).toContain("src/utils/index.ts");
  });

  it("collapses when > 30 files", () => {
    const files = Array.from({ length: 35 }, (_, i) => `file${i}.ts`);
    const html = renderGlobCard(card({ content: { pattern: "*.ts", files, totalFiles: 35 } }));
    expect(html).toContain("glob-collapsed");
    expect(html).toContain("Show all 35 files");
  });
});
