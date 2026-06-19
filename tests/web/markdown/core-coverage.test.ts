import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../packages/web/src/components/chat/markdown/renderer";
import { createMarkdownStream } from "../../../packages/web/src/hooks/use-markdown-stream";
import { parseMarkdown } from "../../../packages/web/src/lib/markdown/parser";
import { sanitizeMarkdown } from "../../../packages/web/src/utils/dompurify";

const XSS_PAYLOADS = [
  '<script>alert(1)</script><p>safe</p>',
  '<img src="x" onerror="alert(1)">',
  '<a href="javascript:alert(1)">bad</a>',
  '<svg onload="alert(1)"><circle></circle></svg>',
  '<math href="javascript:alert(1)"></math>',
  '<iframe src="https://example.com"></iframe>',
  '<p style="background:url(javascript:alert(1))">safe</p>',
  '<object data="javascript:alert(1)"></object>',
  '<form action="javascript:alert(1)"><button>go</button></form>',
  '<details ontoggle="alert(1)"><summary>open</summary></details>',
];

describe("markdown core coverage", () => {
  it("removes dangerous content from representative XSS payloads", () => {
    for (const payload of XSS_PAYLOADS) {
      const sanitized = sanitizeMarkdown(payload).toLowerCase();

      expect(sanitized).not.toContain("<script");
      expect(sanitized).not.toContain("javascript:");
      expect(sanitized).not.toMatch(/\son[a-z]+=/);
      expect(sanitized).not.toContain("<iframe");
      expect(sanitized).not.toContain("<svg");
      expect(sanitized).not.toContain("<object");
      expect(sanitized).not.toContain("<form");
    }
  });

  it("keeps safe unquoted link attributes during markdown sanitization", () => {
    expect(sanitizeMarkdown("<a href=https://example.com title=Docs>Docs</a>")).toBe(
      '<a href="https://example.com" title="Docs" target="_blank" rel="noopener noreferrer">Docs</a>',
    );
  });

  it("resets markdown stream state after partial parsing", () => {
    const stream = createMarkdownStream("```ts\nconst answer = 42;");

    expect(stream.getState().partialStructure).toBe("inCodeBlock");

    const reset = stream.reset();

    expect(reset).toEqual({ rawContent: "", ast: [], partialStructure: "none" });
    expect(stream.getState()).toEqual(reset);
  });

  it("copies raw code without visual line numbers while collapsed rendering hides overflow lines", () => {
    const source = Array.from({ length: 31 }, (_, index) => `line ${index + 1}`).join("\n");
    const html = renderMarkdown(parseMarkdown(`\`\`\`txt\n${source}\n\`\`\``));

    expect(html).toContain(`data-copy="${source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")}"`);
    expect(html).toContain('<span class="markdown-code-line-number" aria-hidden="true">1</span>');
    expect(html).not.toContain('<span class="markdown-code-line-content">line 31</span>');
  });
});
