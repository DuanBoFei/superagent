import { describe, expect, it } from "vitest";
import { sanitizeHtml, sanitizeMarkdown } from "../../../packages/web/src/utils/dompurify";

describe("sanitizeMarkdown", () => {
  it("allows markdown-safe structural tags", () => {
    const html = '<h2>Title</h2><blockquote><p>Quote</p></blockquote><table><thead><tr><th>A</th></tr></thead><tbody><tr><td><mark>1</mark></td></tr></tbody></table><del>old</del><ins>new</ins><small>note</small>';

    expect(sanitizeMarkdown(html)).toBe(html);
  });

  it("adds safe target and rel attributes to links", () => {
    expect(sanitizeMarkdown('<a href="https://example.com">Docs</a>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Docs</a>',
    );
  });

  it("removes script tags, event handlers, and javascript urls", () => {
    const result = sanitizeMarkdown(
      '<script>alert(1)</script><p onclick="alert(1)">Safe</p><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><iframe src="https://example.com"></iframe>',
    );

    expect(result).toBe('<p>Safe</p><img src="x"><a target="_blank" rel="noopener noreferrer">bad</a>');
  });

  it("keeps sanitizeHtml behavior narrower than markdown sanitization", () => {
    expect(sanitizeHtml("<table><tr><td>Cell</td></tr></table>")).toBe("Cell");
    expect(sanitizeMarkdown("<table><tr><td>Cell</td></tr></table>")).toBe("<table><tr><td>Cell</td></tr></table>");
  });
});
