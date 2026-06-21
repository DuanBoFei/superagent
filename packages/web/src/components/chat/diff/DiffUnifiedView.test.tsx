import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiffUnifiedView } from "./DiffUnifiedView";
import type { DiffHunk } from "../../../types/diff";

function makeHunk(overrides?: Partial<DiffHunk>): DiffHunk {
  return {
    hunkIndex: 0,
    oldStart: 1,
    oldLines: 2,
    newStart: 1,
    newLines: 2,
    lines: [
      { type: "context", content: "line 1", oldLineNumber: 1, newLineNumber: 1, charChanges: [] },
      { type: "add", content: "line 2", oldLineNumber: null, newLineNumber: 2, charChanges: [] },
    ],
    isContextHunk: false,
    ...overrides,
  };
}

describe("DiffUnifiedView", () => {
  it("renders empty message when no hunks", () => {
    render(
      <DiffUnifiedView hunks={[]} collapsedHunks={new Set()} onToggleHunk={vi.fn()} />,
    );
    expect(screen.getByText("No changes")).toBeDefined();
  });

  it("renders hunk headers", () => {
    render(
      <DiffUnifiedView
        hunks={[makeHunk(), makeHunk({ hunkIndex: 1, oldStart: 10, newStart: 10 })]}
        collapsedHunks={new Set()}
        onToggleHunk={vi.fn()}
      />,
    );
    const headers = document.querySelectorAll(".diff-hunk-header");
    expect(headers.length).toBe(2);
  });

  it("renders diff lines", () => {
    render(
      <DiffUnifiedView hunks={[makeHunk()]} collapsedHunks={new Set()} onToggleHunk={vi.fn()} />,
    );
    const lines = document.querySelectorAll(".diff-line");
    expect(lines.length).toBe(2);
  });

  it("shows collapsed header without lines for collapsed hunk", () => {
    render(
      <DiffUnifiedView
        hunks={[makeHunk()]}
        collapsedHunks={new Set([0])}
        onToggleHunk={vi.fn()}
      />,
    );
    const collapsedHeaders = document.querySelectorAll(".diff-hunk-collapsed");
    expect(collapsedHeaders.length).toBe(1);
    const lines = document.querySelectorAll(".diff-line");
    expect(lines.length).toBe(0);
  });

  it("calls onToggleHunk when header clicked", () => {
    const onToggle = vi.fn();
    render(
      <DiffUnifiedView
        hunks={[makeHunk({ hunkIndex: 2 })]}
        collapsedHunks={new Set()}
        onToggleHunk={onToggle}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith(2);
  });
});
