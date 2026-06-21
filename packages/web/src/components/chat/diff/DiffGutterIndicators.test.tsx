import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { DiffGutterIndicators } from "./DiffGutterIndicators";
import type { DiffHunk } from "../../../types/diff";

function makeHunk(overrides?: Partial<DiffHunk>): DiffHunk {
  return {
    hunkIndex: 0,
    oldStart: 1,
    oldLines: 3,
    newStart: 1,
    newLines: 3,
    lines: [
      { type: "delete", content: "-old", oldLineNumber: 1, newLineNumber: null, charChanges: [] },
      { type: "add", content: "+new", oldLineNumber: null, newLineNumber: 1, charChanges: [] },
      { type: "context", content: " ctx", oldLineNumber: 2, newLineNumber: 2, charChanges: [] },
    ],
    isContextHunk: false,
    ...overrides,
  };
}

describe("DiffGutterIndicators", () => {
  it("returns null when no hunks", () => {
    const { container } = render(
      <DiffGutterIndicators hunks={[]} totalLines={100} onScrollToHunk={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when totalLines is 0", () => {
    const { container } = render(
      <DiffGutterIndicators hunks={[makeHunk()]} totalLines={0} onScrollToHunk={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders markers for hunks with changes", () => {
    render(
      <DiffGutterIndicators hunks={[makeHunk()]} totalLines={100} onScrollToHunk={vi.fn()} />,
    );
    const markers = document.querySelectorAll(".diff-gutter-marker");
    expect(markers.length).toBeGreaterThan(0);
  });

  it("skips context-only hunks", () => {
    const contextHunk = makeHunk({
      lines: [
        { type: "context", content: "a", oldLineNumber: 1, newLineNumber: 1, charChanges: [] },
      ],
    });
    render(
      <DiffGutterIndicators hunks={[contextHunk]} totalLines={100} onScrollToHunk={vi.fn()} />,
    );
    const markers = document.querySelectorAll(".diff-gutter-marker");
    expect(markers.length).toBe(0);
  });

  it("calls onScrollToHunk when marker clicked", () => {
    const onScrollToHunk = vi.fn();
    render(
      <DiffGutterIndicators hunks={[makeHunk()]} totalLines={100} onScrollToHunk={onScrollToHunk} />,
    );
    const marker = document.querySelector("button") as HTMLButtonElement;
    if (marker) fireEvent.click(marker);
    expect(onScrollToHunk).toHaveBeenCalledWith(0);
  });
});
