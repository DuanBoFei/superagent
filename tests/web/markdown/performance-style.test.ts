import { describe, expect, it } from "vitest";
import { renderMessageBubble } from "../../../packages/web/src/components/chat/message-bubble";
import { parseMarkdown } from "../../../packages/web/src/lib/markdown/parser";
import { renderMarkdown } from "../../../packages/web/src/components/chat/markdown/renderer";


describe("markdown performance and style refinements", () => {
  it("marks collapsed code toggles with accessible expanded state", () => {
    const source = Array.from({ length: 31 }, (_, index) => `line ${index + 1}`).join("\n");
    const html = renderMarkdown(parseMarkdown(`\`\`\`txt\n${source}\n\`\`\``));

    expect(html).toContain('<button class="markdown-code-toggle" type="button" data-expanded="false" aria-expanded="false">Expand 31 lines</button>');
    expect(html).not.toContain('<span class="markdown-code-line-content">line 31</span>');
  });

  it("adds stream-aware markdown content attributes to assistant bubbles", () => {
    const html = renderMessageBubble({
      id: "m1",
      role: "assistant",
      content: "## Title",
      ast: parseMarkdown("## Title"),
      partialStructure: "inCodeBlock",
      timestamp: 1,
      status: "streaming",
    });

    expect(html).toContain('class="message-content markdown-content font-mono text-[13px] min-h-6"');
    expect(html).toContain('data-partial-structure="inCodeBlock"');
  });
});
