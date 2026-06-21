import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TitleEdit } from "./title-edit";

describe("TitleEdit", () => {
  it("renders title text", () => {
    render(<TitleEdit initialTitle="My Session" />);
    expect(screen.getByText("My Session")).toBeDefined();
  });

  it("renders fallback for empty title", () => {
    render(<TitleEdit initialTitle="" />);
    expect(screen.getByText("Untitled Session")).toBeDefined();
  });

  it("enters edit mode on click", () => {
    render(<TitleEdit initialTitle="Old Title" />);
    fireEvent.click(screen.getByText("Old Title"));
    const input = screen.getByDisplayValue("Old Title");
    expect(input).toBeDefined();
    expect(input.tagName).toBe("INPUT");
  });

  it("calls onSave on Enter", () => {
    const onSave = vi.fn();
    render(<TitleEdit initialTitle="Old" onSave={onSave} />);
    fireEvent.click(screen.getByText("Old"));
    const input = screen.getByDisplayValue("Old");
    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("New Title");
  });

  it("reverts on Escape", () => {
    const onSave = vi.fn();
    render(<TitleEdit initialTitle="Keep" onSave={onSave} />);
    fireEvent.click(screen.getByText("Keep"));
    const input = screen.getByDisplayValue("Keep");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Keep")).toBeDefined();
  });

  it("commits on blur", () => {
    const onSave = vi.fn();
    render(<TitleEdit initialTitle="Old" onSave={onSave} />);
    fireEvent.click(screen.getByText("Old"));
    const input = screen.getByDisplayValue("Old");
    fireEvent.change(input, { target: { value: "New" } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith("New");
  });

  it("commits whitespace as Untitled Session", () => {
    const onSave = vi.fn();
    render(<TitleEdit initialTitle="Old" onSave={onSave} />);
    fireEvent.click(screen.getByText("Old"));
    const input = screen.getByDisplayValue("Old");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    // Whitespace-only trims to empty → resolved to "Untitled Session"
    expect(onSave).toHaveBeenCalledWith("Untitled Session");
  });
});
