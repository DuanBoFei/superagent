import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../../../packages/web/src/lib/markdown/parser";
import { renderMarkdown } from "../../../packages/web/src/components/chat/markdown/renderer";

describe("renderMarkdown", () => {
  it("renders headings, inline code, blockquotes, rules, and lists", () => {
    const ast = parseMarkdown("## Title\n\nUse `pnpm test`.\n\n> quoted\n\n---\n\n- first\n- second");
    const html = renderMarkdown(ast);

    expect(html).toContain('<h2 class="markdown-heading markdown-heading-2">Title</h2>');
    expect(html).toContain('<code class="markdown-inline-code">pnpm test</code>');
    expect(html).toContain('<blockquote class="markdown-blockquote">');
    expect(html).toContain('<hr class="markdown-rule">');
    expect(html).toContain('<ul class="markdown-list markdown-list-unordered">');
    expect(html).toContain('<li class="markdown-list-item">first</li>');
  });

  it("renders task list items with disabled checkboxes", () => {
    const ast = parseMarkdown("- [x] done\n- [ ] todo");
    const html = renderMarkdown(ast);

    expect(html).toContain('<input type="checkbox" checked disabled aria-label="Completed task">');
    expect(html).toContain('<input type="checkbox" disabled aria-label="Incomplete task">');
  });

  it("escapes text and inline code content", () => {
    const ast = parseMarkdown("Text <unsafe> and `<tag>`");
    const html = renderMarkdown(ast);

    expect(html).toContain("Text &lt;unsafe&gt; and ");
    expect(html).toContain("&lt;tag&gt;");
    expect(html).not.toContain("<unsafe>");
  });
});
