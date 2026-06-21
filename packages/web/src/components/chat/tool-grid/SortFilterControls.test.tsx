import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortFilterControls } from "./SortFilterControls";

describe("SortFilterControls", () => {
  const defaultProps = {
    sortBy: "status" as const,
    sortOrder: "asc" as const,
    filterStatus: "all" as const,
    onSortBy: vi.fn(),
    onToggleSortOrder: vi.fn(),
    onFilterBy: vi.fn(),
  };

  it("renders sort select with options", () => {
    render(<SortFilterControls {...defaultProps} />);
    const select = document.querySelector(".sort-select");
    expect(select).toBeDefined();
    expect(screen.getByText("Ascending")).toBeDefined();
  });

  it("renders filter buttons", () => {
    render(<SortFilterControls {...defaultProps} />);
    expect(screen.getByText("All")).toBeDefined();
    expect(screen.getByText("Running")).toBeDefined();
    expect(screen.getByText("Failed")).toBeDefined();
    expect(screen.getByText("Completed")).toBeDefined();
  });

  it("marks active filter button", () => {
    render(<SortFilterControls {...defaultProps} filterStatus="failed" />);
    const btn = screen.getByText("Failed");
    expect(btn.className).toContain("filter-active-failed");
  });

  it("calls onSortBy when select changes", () => {
    const onSortBy = vi.fn();
    render(<SortFilterControls {...defaultProps} onSortBy={onSortBy} />);
    const select = document.querySelector(".sort-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "duration" } });
    expect(onSortBy).toHaveBeenCalledWith("duration");
  });

  it("calls onToggleSortOrder when direction button clicked", () => {
    const onToggleSortOrder = vi.fn();
    render(<SortFilterControls {...defaultProps} onToggleSortOrder={onToggleSortOrder} />);
    fireEvent.click(screen.getByText("Ascending"));
    expect(onToggleSortOrder).toHaveBeenCalledOnce();
  });

  it("calls onFilterBy when filter button clicked", () => {
    const onFilterBy = vi.fn();
    render(<SortFilterControls {...defaultProps} onFilterBy={onFilterBy} />);
    fireEvent.click(screen.getByText("Running"));
    expect(onFilterBy).toHaveBeenCalledWith("running");
  });

  it("shows Descending when sortOrder is desc", () => {
    render(<SortFilterControls {...defaultProps} sortOrder="desc" />);
    expect(screen.getByText("Descending")).toBeDefined();
  });
});
