import { describe, expect, it } from "vitest";
import { getLanguageName, highlightCode } from "../../../packages/web/src/lib/markdown/syntax-highlight";

describe("highlightCode", () => {
  it("highlights TypeScript keywords, strings, numbers, and comments", () => {
    const html = highlightCode('const answer: number = 42;\n// done\nconsole.log("ok");', "ts");

    expect(html).toContain('<span class="token keyword">const</span>');
    expect(html).toContain('<span class="token number">42</span>');
    expect(html).toContain('<span class="token comment">// done</span>');
    expect(html).toContain('<span class="token string">&quot;ok&quot;</span>');
  });

  it("escapes code before adding highlight spans", () => {
    const html = highlightCode("if (a < b) return '<tag>';", "js");

    expect(html).toContain("&lt;");
    expect(html).toContain("&lt;tag&gt;");
    expect(html).not.toContain("<tag>");
  });

  it("falls back to escaped plain code for unknown languages", () => {
    expect(highlightCode("<unsafe>", "unknown-lang")).toBe("&lt;unsafe&gt;");
  });
});

describe("getLanguageName", () => {
  it.each([
    ["ts", "TypeScript"],
    ["tsx", "TSX"],
    ["js", "JavaScript"],
    ["py", "Python"],
    ["cpp", "C++"],
    ["sh", "Shell"],
    ["unknown", "Plain Text"],
  ] as const)("maps %s to %s", (lang, name) => {
    expect(getLanguageName(lang)).toBe(name);
  });
});
