import { describe, expect, it } from "vitest";
import { renderCopyButton, stripAnsiForCopy, escapeForDataAttr } from "../../../../packages/web/src/components/chat/terminal/TerminalCopy";

describe("renderCopyButton", () => {
  it("renders a copy button with data-action", () => {
    const html = renderCopyButton();
    expect(html).toContain("copy-terminal");
    expect(html).toContain('aria-label="Copy terminal output"');
    expect(html).toContain("Copy");
  });
});

describe("stripAnsiForCopy", () => {
  it("strips SGR escape sequences", () => {
    const result = stripAnsiForCopy("\x1b[31mred\x1b[0m text");
    expect(result).toBe("red text");
  });

  it("strips cursor movement sequences", () => {
    const result = stripAnsiForCopy("\x1b[10;20Hpositioned");
    expect(result).toBe("positioned");
  });

  it("preserves plain text unchanged", () => {
    const result = stripAnsiForCopy("plain text\nwith newlines");
    expect(result).toBe("plain text\nwith newlines");
  });

  it("strips BEL characters", () => {
    const result = stripAnsiForCopy("alert\x07 text");
    expect(result).toBe("alert text");
  });
});

describe("escapeForDataAttr", () => {
  it("escapes HTML special characters", () => {
    const result = escapeForDataAttr('<script>alert("x")</script>');
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("converts newlines to HTML entity", () => {
    const result = escapeForDataAttr("line1\nline2");
    expect(result).toContain("&#10;");
  });
});
