import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiffNavigationControls } from "./DiffNavigationControls";

describe("DiffNavigationControls", () => {
  it("renders position text", () => {
    render(<DiffNavigationControls currentHunkIndex={2} totalHunks={5} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("3 / 5")).toBeDefined();
  });

  it("renders 0 / 0 when no hunks", () => {
    render(<DiffNavigationControls currentHunkIndex={0} totalHunks={0} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByText("0 / 0")).toBeDefined();
  });

  it("disables prev button at start", () => {
    render(<DiffNavigationControls currentHunkIndex={0} totalHunks={5} onPrev={vi.fn()} onNext={vi.fn()} />);
    const prevBtn = screen.getByLabelText("Previous change");
    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables next button at end", () => {
    render(<DiffNavigationControls currentHunkIndex={4} totalHunks={5} onPrev={vi.fn()} onNext={vi.fn()} />);
    const nextBtn = screen.getByLabelText("Next change");
    expect((nextBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls onPrev when prev clicked", () => {
    const onPrev = vi.fn();
    render(<DiffNavigationControls currentHunkIndex={2} totalHunks={5} onPrev={onPrev} onNext={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Previous change"));
    expect(onPrev).toHaveBeenCalled();
  });

  it("calls onNext when next clicked", () => {
    const onNext = vi.fn();
    render(<DiffNavigationControls currentHunkIndex={2} totalHunks={5} onPrev={vi.fn()} onNext={onNext} />);
    fireEvent.click(screen.getByLabelText("Next change"));
    expect(onNext).toHaveBeenCalled();
  });
});
