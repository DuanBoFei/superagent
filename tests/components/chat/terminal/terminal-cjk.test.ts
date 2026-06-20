import { describe, expect, it } from "vitest";
import { renderTerminal } from "../../../../packages/web/src/components/chat/terminal/TerminalRenderer";

// CJK and Emoji width handling tests
describe("CJK and Emoji rendering", () => {
  it("renders CJK characters correctly", () => {
    const html = renderTerminal("你好世界");
    expect(html).toContain("你好世界");
  });

  it("renders Japanese characters", () => {
    const html = renderTerminal("こんにちは");
    expect(html).toContain("こんにちは");
  });

  it("renders Korean characters", () => {
    const html = renderTerminal("안녕하세요");
    expect(html).toContain("안녕하세요");
  });

  it("renders Emoji characters", () => {
    const html = renderTerminal("✅ ❌ ⚠️");
    expect(html).toContain("✅");
    expect(html).toContain("❌");
  });

  it("renders mixed CJK and ASCII text", () => {
    const html = renderTerminal("文件: readme.md (12 KB)");
    expect(html).toContain("文件");
    expect(html).toContain("readme.md");
  });

  it("preserves CJK characters after ANSI codes", () => {
    const html = renderTerminal("\x1b[32m成功\x1b[0m \x1b[31m失败\x1b[0m");
    expect(html).toContain("成功");
    expect(html).toContain("失败");
  });
});

describe("terminal integration smoke tests", () => {
  it("renders git diff style output", () => {
    const content = "\x1b[31m-removed line\x1b[0m\n\x1b[32m+added line\x1b[0m\n normal line";
    const html = renderTerminal(content);
    expect(html).toContain("removed line");
    expect(html).toContain("added line");
    expect(html).toContain("normal line");
  });

  it("renders npm test style output", () => {
    const content = "\x1b[32m✓\x1b[0m tests pass\n\x1b[31m✗\x1b[0m 1 failure\n\x1b[33m⚠\x1b[0m 2 warnings";
    const html = renderTerminal(content);
    expect(html).toContain("✓");
    expect(html).toContain("✗");
  });

  it("renders progress bar with CR characters", () => {
    const content = "[----------]\r[#####-----]\r[##########] Done!";
    const html = renderTerminal(content);
    expect(html).toContain("Done!");
  });

  it("handles long output with many ANSI codes", () => {
    let content = "";
    for (let i = 0; i < 100; i++) {
      content += `\x1b[${31 + (i % 7)}mLine ${i} with color\x1b[0m\n`;
    }
    const html = renderTerminal(content);
    expect(html).toContain("Line 0");
    expect(html).toContain("Line 99");
  });

  it("renders dark theme background", () => {
    const html = renderTerminal("test");
    expect(html).toContain("background:#1e1e1e");
  });

  it("has accessible ARIA attributes", () => {
    const html = renderTerminal("test");
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-label="Terminal output"');
  });

  it("uses monospace font with emoji fallback", () => {
    const html = renderTerminal("code");
    expect(html).toContain("Consolas");
    expect(html).toContain("monospace");
  });
});
