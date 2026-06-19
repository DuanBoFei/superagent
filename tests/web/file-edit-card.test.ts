import { describe, expect, it } from "vitest";
import { renderFileEditCard } from "../../packages/web/src/components/chat/cards/FileEditCard";
import type { FileEditCard } from "../../packages/web/src/types/cards";

function card(overrides: Partial<FileEditCard> = {}): FileEditCard {
  return {
    id: "e1", type: "file-edit", status: "success", timestamp: 1_720_000_000_000,
    title: "Edited src/utils.ts", isExpanded: true, isCollapsible: true,
    content: { filePath: "src/utils.ts", diff: "@@ -1,3 +1,4 @@\n line\n+added\n-removed", linesAdded: 1, linesRemoved: 1 },
    ...overrides,
  } as FileEditCard;
}

describe("renderFileEditCard", () => {
  it("displays file path and diff stats", () => {
    const html = renderFileEditCard(card());
    expect(html).toContain("src/utils.ts");
    expect(html).toContain("+1");
    expect(html).toContain("-1");
  });

  it("shows added lines with green and removed with red", () => {
    const html = renderFileEditCard(card());
    expect(html).toContain("added");
    expect(html).toContain("removed");
  });

  it("collapses large diffs (>100 lines)", () => {
    const bigDiff = Array.from({ length: 120 }, (_, i) => `+line ${i}`).join("\n");
    const html = renderFileEditCard(card({ content: { filePath: "big.ts", diff: bigDiff, linesAdded: 120, linesRemoved: 0 } }));
    expect(html).toContain("edit-collapsed");
  });
});
