import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ViewToggle } from "./ViewToggle";

describe("ViewToggle", () => {
  it("renders grid and list buttons", () => {
    render(<ViewToggle viewMode="grid" onSetView={vi.fn()} />);
    expect(screen.getByText("Grid")).toBeDefined();
    expect(screen.getByText("List")).toBeDefined();
  });

  it("marks grid as active when viewMode is grid", () => {
    render(<ViewToggle viewMode="grid" onSetView={vi.fn()} />);
    const gridBtn = screen.getByText("Grid");
    expect(gridBtn.className).toContain("view-active-grid");
    expect(gridBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("marks list as active when viewMode is list", () => {
    render(<ViewToggle viewMode="list" onSetView={vi.fn()} />);
    const listBtn = screen.getByText("List");
    expect(listBtn.className).toContain("view-active-list");
    expect(listBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onSetView with grid when grid button clicked", () => {
    const onSetView = vi.fn();
    render(<ViewToggle viewMode="list" onSetView={onSetView} />);
    fireEvent.click(screen.getByText("Grid"));
    expect(onSetView).toHaveBeenCalledWith("grid");
  });

  it("calls onSetView with list when list button clicked", () => {
    const onSetView = vi.fn();
    render(<ViewToggle viewMode="grid" onSetView={onSetView} />);
    fireEvent.click(screen.getByText("List"));
    expect(onSetView).toHaveBeenCalledWith("list");
  });
});
