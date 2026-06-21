import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DiffLine } from "./DiffLine";
import type { DiffLine as DiffLineType } from "../../../types/diff";

function makeLine(overrides?: Partial<DiffLineType>): DiffLineType {
  return {
    type: "context",
    content: "const x = 1;",
    oldLineNumber: 10,
    newLineNumber: 10,
    charChanges: [],
    ...overrides,
  };
}

describe("DiffLine", () => {
  it("renders line numbers", () => {
    render(<DiffLine line={makeLine({ oldLineNumber: 5, newLineNumber: 6 })} />);
    const nums = document.querySelectorAll(".diff-line-num");
    expect(nums.length).toBe(2);
    expect(nums[0].textContent).toBe("5");
    expect(nums[1].textContent).toBe("6");
  });

  it("renders empty line number for null", () => {
    render(<DiffLine line={makeLine({ oldLineNumber: null, newLineNumber: null })} />);
    const nums = document.querySelectorAll(".diff-line-num");
    expect(nums[0].textContent?.trim()).toBe("");
    expect(nums[1].textContent?.trim()).toBe("");
  });

  it("renders add line with + prefix and green style", () => {
    render(<DiffLine line={makeLine({ type: "add", newLineNumber: 3, oldLineNumber: null })} />);
    const prefix = document.querySelector(".diff-line-prefix");
    expect(prefix?.textContent).toBe("+");
    const line = document.querySelector(".diff-line");
    expect(line?.className).toContain("bg-emerald");
  });

  it("renders delete line with - prefix and red style", () => {
    render(<DiffLine line={makeLine({ type: "delete", oldLineNumber: 3, newLineNumber: null })} />);
    const prefix = document.querySelector(".diff-line-prefix");
    expect(prefix?.textContent).toBe("-");
    const line = document.querySelector(".diff-line");
    expect(line?.className).toContain("bg-red");
  });

  it("renders modify line with ~ prefix and amber style", () => {
    render(<DiffLine line={makeLine({ type: "modify" })} />);
    const prefix = document.querySelector(".diff-line-prefix");
    expect(prefix?.textContent).toBe("~");
    const line = document.querySelector(".diff-line");
    expect(line?.className).toContain("bg-amber");
  });

  it("renders content text", () => {
    render(<DiffLine line={makeLine({ content: "hello world" })} />);
    const content = document.querySelector(".diff-line-content");
    expect(content?.textContent).toBe("hello world");
  });

  it("renders char-level highlights when enabled", () => {
    render(
      <DiffLine
        line={makeLine({
          type: "add",
          content: "changed text",
          charChanges: [{ start: 0, end: 7, type: "add" }],
        })}
        showCharHighlighting
      />,
    );
    const charAdd = document.querySelector(".diff-char-add");
    expect(charAdd).toBeDefined();
  });

  it("does not render char highlights when disabled", () => {
    render(
      <DiffLine
        line={makeLine({
          type: "add",
          content: "changed text",
          charChanges: [{ start: 0, end: 7, type: "add" }],
        })}
      />,
    );
    const charAdd = document.querySelector(".diff-char-add");
    expect(charAdd).toBeNull();
  });
});
