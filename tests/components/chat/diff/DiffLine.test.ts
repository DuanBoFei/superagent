import { describe, expect, it } from "vitest";
import { renderDiffLine } from "../../../../packages/web/src/components/chat/diff/DiffLine";
import type { DiffLine as DiffLineType } from "../../../../packages/web/src/types/diff";

function makeLine(
  overrides: Partial<DiffLineType> = {},
): DiffLineType {
  return {
    type: "context",
    oldLineNumber: 1,
    newLineNumber: 1,
    content: "line content",
    charChanges: [],
    ...overrides,
  };
}

describe("renderDiffLine", () => {
  it("renders added line with green styling", () => {
    const html = renderDiffLine(
      makeLine({ type: "add", content: "new line" }),
    );
    expect(html).toContain("bg-emerald-950/30");
    expect(html).toContain("text-emerald-300");
    expect(html).toContain("new line");
    expect(html).toContain("+");
  });

  it("renders deleted line with red styling", () => {
    const html = renderDiffLine(
      makeLine({ type: "delete", content: "old line" }),
    );
    expect(html).toContain("bg-red-950/30");
    expect(html).toContain("text-red-300");
    expect(html).toContain("old line");
    expect(html).toContain("-");
  });

  it("renders context line with neutral styling", () => {
    const html = renderDiffLine(
      makeLine({ type: "context", content: "unchanged" }),
    );
    expect(html).toContain("text-neutral-400");
    expect(html).toContain("unchanged");
  });

  it("renders empty placeholder line", () => {
    const html = renderDiffLine(
      makeLine({ type: "empty", oldLineNumber: null, newLineNumber: null, content: "" }),
    );
    expect(html).toContain("text-neutral-600");
  });

  it("renders line numbers for both old and new", () => {
    const html = renderDiffLine(
      makeLine({ oldLineNumber: 5, newLineNumber: 10 }),
    );
    expect(html).toContain(">5<");
    expect(html).toContain(">10<");
  });

  it("renders null line numbers as blank", () => {
    const html = renderDiffLine(
      makeLine({ type: "add", oldLineNumber: null, newLineNumber: 7 }),
    );
    expect(html).toContain("w-12"); // number column width
  });

  it("escapes HTML in content", () => {
    const html = renderDiffLine(
      makeLine({ content: '<script>alert("xss")</script>' }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders character-level highlights when present", () => {
    const html = renderDiffLine(
      makeLine({
        type: "add",
        content: "changed text",
        charChanges: [{ start: 0, end: 7, type: "add" }],
      }),
      { showCharHighlighting: true },
    );
    expect(html).toContain("diff-char-add");
    expect(html).toContain("bg-emerald-600/50");
  });
});
