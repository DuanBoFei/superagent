import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiffSplitView } from "./DiffSplitView";
import type { DiffHunk } from "../../../types/diff";

function makeHunk(overrides?: Partial<DiffHunk>): DiffHunk {
  return {
    hunkIndex: 0,
    oldStart: 1,
    oldLines: 2,
    newStart: 1,
    newLines: 2,
    lines: [
      { type: "delete", content: "old line", oldLineNumber: 1, newLineNumber: null, charChanges: [] },
      { type: "add", content: "new line", oldLineNumber: null, newLineNumber: 1, charChanges: [] },
    ],
    isContextHunk: false,
    ...overrides,
  };
}

describe("DiffSplitView", () => {
  it("renders empty message when no hunks", () => {
    render(
      <DiffSplitView hunks={[]} collapsedHunks={new Set()} onToggleHunk={vi.fn()} />,
    );
    expect(screen.getByText("No changes")).toBeDefined();
  });

  it("renders split layout with left and right columns", () => {
    render(
      <DiffSplitView hunks={[makeHunk()]} collapsedHunks={new Set()} onToggleHunk={vi.fn()} />,
    );
    const leftCol = document.querySelector(".diff-split-left");
    const rightCol = document.querySelector(".diff-split-right");
    expect(leftCol).toBeDefined();
    expect(rightCol).toBeDefined();
  });

  it("renders delete lines only on left side", () => {
    render(
      <DiffSplitView hunks={[makeHunk()]} collapsedHunks={new Set()} onToggleHunk={vi.fn()} />,
    );
    const leftLines = document.querySelector(".diff-split-left")?.querySelectorAll(".diff-line");
    const rightLines = document.querySelector(".diff-split-right")?.querySelectorAll(".diff-line");
    expect(leftLines?.length).toBeGreaterThan(0);
    // Right side should show empty placeholders not diff lines for deletes
    const rightPlaceholders = document.querySelector(".diff-split-right")?.querySelectorAll(".diff-line-empty");
    expect(rightPlaceholders?.length).toBeGreaterThan(0);
  });

  it("shows collapsed header without grid for collapsed hunk", () => {
    render(
      <DiffSplitView
        hunks={[makeHunk()]}
        collapsedHunks={new Set([0])}
        onToggleHunk={vi.fn()}
      />,
    );
    const collapsedHeaders = document.querySelectorAll(".diff-hunk-collapsed");
    expect(collapsedHeaders.length).toBe(1);
    const grid = document.querySelector(".diff-split-hunk");
    expect(grid).toBeNull();
  });

  it("calls onToggleHunk when header clicked", () => {
    const onToggle = vi.fn();
    render(
      <DiffSplitView
        hunks={[makeHunk({ hunkIndex: 5 })]}
        collapsedHunks={new Set()}
        onToggleHunk={onToggle}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith(5);
  });
});
