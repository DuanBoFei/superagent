import { describe, expect, it } from "vitest";
import { renderFileWriteCard } from "../../packages/web/src/components/chat/cards/FileWriteCard";
import type { FileWriteCard } from "../../packages/web/src/types/cards";

function card(overrides: Partial<FileWriteCard> = {}): FileWriteCard {
  return {
    id: "w1", type: "file-write", status: "success", timestamp: 1_720_000_000_000,
    title: "Created config.json", isExpanded: true, isCollapsible: false,
    content: { filePath: "config.json", linesWritten: 12, content: '{"key": "value"}' },
    ...overrides,
  } as FileWriteCard;
}

describe("renderFileWriteCard", () => {
  it("displays file path and lines written", () => {
    const html = renderFileWriteCard(card());
    expect(html).toContain("config.json");
    expect(html).toContain("12");
    expect(html).toContain("lines");
  });

  it("displays the written content", () => {
    const html = renderFileWriteCard(card());
    expect(html).toContain("&quot;key&quot;");
  });

  it("shows a 'new file' label", () => {
    const html = renderFileWriteCard(card());
    expect(html).toContain("New");
  });
});
