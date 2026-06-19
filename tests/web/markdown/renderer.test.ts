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

  it("renders safe links with new-tab security attributes", () => {
    const ast = parseMarkdown('[Docs](https://example.com "Read docs")');
    const html = renderMarkdown(ast);

    expect(html).toContain(
      '<a class="markdown-link" href="https://example.com" title="Read docs" target="_blank" rel="noopener noreferrer">Docs</a>',
    );
  });

  it("drops unsafe javascript link urls", () => {
    const ast = parseMarkdown("[bad](javascript:alert(1))");
    const html = renderMarkdown(ast);

    expect(html).toContain('<a class="markdown-link" target="_blank" rel="noopener noreferrer">bad</a>');
    expect(html).not.toContain("javascript:");
  });

  it("renders images with lazy loading and bounded layout", () => {
    const ast = parseMarkdown('![Alt](https://example.com/image.png "Preview")');
    const html = renderMarkdown(ast);

    expect(html).toContain(
      '<img class="markdown-image" src="https://example.com/image.png" alt="Alt" title="Preview" loading="lazy">',
    );
    expect(html).toContain('<span class="markdown-image-skeleton" aria-hidden="true"></span>');
  });

  it("renders broken image fallback text and drops unsafe image urls", () => {
    const ast = parseMarkdown("![Bad](javascript:alert(1))");
    const html = renderMarkdown(ast);

    expect(html).toContain('<span class="markdown-image-fallback" role="img" aria-label="Bad">Bad</span>');
    expect(html).not.toContain("javascript:");
  });
});
