import { describe, expect, it } from "vitest";
import { renderFileReadCard } from "../../packages/web/src/components/chat/cards/FileReadCard";
import type { FileReadCard } from "../../packages/web/src/types/cards";

function card(overrides: Partial<FileReadCard> = {}): FileReadCard {
  return {
    id: "r1",
    type: "file-read",
    status: "success",
    timestamp: 1_720_000_000_000,
    title: "Read src/index.ts",
    isExpanded: true,
    isCollapsible: true,
    content: { filePath: "src/index.ts", fileSize: 2048, lineCount: 64, content: 'import http from "node:http";', language: "typescript" },
    ...overrides,
  } as FileReadCard;
}

describe("renderFileReadCard", () => {
  it("displays file path and metadata", () => {
    const html = renderFileReadCard(card());
    expect(html).toContain("src/index.ts");
    expect(html).toContain("2.0KB");
    expect(html).toContain("64");
  });

  it("displays file content with line numbers", () => {
    const html = renderFileReadCard(card());
    expect(html).toContain("node:http");
  });

  it("shows language label", () => {
    const html = renderFileReadCard(card({ content: { filePath: "app.ts", fileSize: 100, lineCount: 3, content: "const x = 1;", language: "typescript" } }));
    expect(html).toContain("typescript");
  });

  it("collapses content > 50 lines", () => {
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i}`).join("\n");
    const html = renderFileReadCard(card({ content: { filePath: "big.ts", fileSize: 5000, lineCount: 60, content: lines, language: "typescript" } }));
    expect(html).toContain("read-collapsed");
  });
});
