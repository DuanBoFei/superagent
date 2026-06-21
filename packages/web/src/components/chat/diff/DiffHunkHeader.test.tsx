import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiffHunkHeader } from "./DiffHunkHeader";
import type { DiffHunk } from "../../../types/diff";

function makeHunk(overrides?: Partial<DiffHunk>): DiffHunk {
  return {
    hunkIndex: 0,
    oldStart: 10,
    oldLines: 5,
    newStart: 10,
    newLines: 6,
    lines: [],
    isContextHunk: false,
    ...overrides,
  };
}

describe("DiffHunkHeader", () => {
  it("renders hunk range", () => {
    render(<DiffHunkHeader hunk={makeHunk()} collapsed={false} onToggle={vi.fn()} />);
    expect(screen.getByText(/@@ -10,5 \+10,6 @@/)).toBeDefined();
  });

  it("renders collapsed state with lines hidden count", () => {
    const hunk = makeHunk({ lines: new Array(15).fill({} as never) });
    render(<DiffHunkHeader hunk={hunk} collapsed={true} onToggle={vi.fn()} />);
    expect(screen.getByText("15 lines hidden")).toBeDefined();
  });

  it("renders non-collapsible as plain div", () => {
    render(<DiffHunkHeader hunk={makeHunk()} collapsed={false} collapsible={false} onToggle={vi.fn()} />);
    const btn = document.querySelector("button.diff-hunk-header");
    expect(btn).toBeNull();
  });

  it("calls onToggle when clicked (expanded state)", () => {
    const onToggle = vi.fn();
    render(<DiffHunkHeader hunk={makeHunk({ hunkIndex: 3 })} collapsed={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith(3);
  });

  it("calls onToggle when clicked (collapsed state)", () => {
    const onToggle = vi.fn();
    render(<DiffHunkHeader hunk={makeHunk({ hunkIndex: 5 })} collapsed={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith(5);
  });
});
