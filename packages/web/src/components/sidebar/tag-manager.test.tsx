import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TagManager } from "./tag-manager";

describe("TagManager", () => {
  it("renders existing tags", () => {
    render(<TagManager tags={["bug", "feature"]} />);
    expect(screen.getByText("bug")).toBeDefined();
    expect(screen.getByText("feature")).toBeDefined();
  });

  it("renders input for adding tags", () => {
    render(<TagManager tags={[]} />);
    expect(screen.getByPlaceholderText(/add tag/i)).toBeDefined();
  });

  it("calls onAddTag on Enter with trimmed value", () => {
    const onAddTag = vi.fn();
    render(<TagManager tags={[]} onAddTag={onAddTag} />);
    const input = screen.getByPlaceholderText(/add tag/i);
    fireEvent.change(input, { target: { value: "new-tag" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAddTag).toHaveBeenCalledWith("new-tag");
  });

  it("does not add empty tag on Enter", () => {
    const onAddTag = vi.fn();
    render(<TagManager tags={[]} onAddTag={onAddTag} />);
    const input = screen.getByPlaceholderText(/add tag/i);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAddTag).not.toHaveBeenCalled();
  });

  it("does not add whitespace-only tag", () => {
    const onAddTag = vi.fn();
    render(<TagManager tags={[]} onAddTag={onAddTag} />);
    const input = screen.getByPlaceholderText(/add tag/i);
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAddTag).not.toHaveBeenCalled();
  });

  it("calls onRemoveTag on chip click", () => {
    const onRemoveTag = vi.fn();
    render(<TagManager tags={["bug"]} onRemoveTag={onRemoveTag} />);
    const removeBtn = document.querySelector(".tag-chip-remove") as HTMLButtonElement;
    if (removeBtn) fireEvent.click(removeBtn);
    expect(onRemoveTag).toHaveBeenCalledWith("bug");
  });

  it("calls onTagClick when tag chip clicked", () => {
    const onTagClick = vi.fn();
    render(<TagManager tags={["bug"]} onTagClick={onTagClick} />);
    fireEvent.click(screen.getByText("bug"));
    expect(onTagClick).toHaveBeenCalledWith("bug");
  });

  it("shows empty state when no tags", () => {
    render(<TagManager tags={[]} />);
    expect(screen.getByText(/add tags/i)).toBeDefined();
  });
});
