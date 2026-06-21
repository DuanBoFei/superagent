import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiffViewModeToggle } from "./DiffViewModeToggle";

describe("DiffViewModeToggle", () => {
  it("renders both mode buttons", () => {
    render(<DiffViewModeToggle currentMode="unified" onSetMode={vi.fn()} />);
    expect(screen.getByText("Unified")).toBeDefined();
    expect(screen.getByText("Split")).toBeDefined();
  });

  it("highlights unified when active", () => {
    render(<DiffViewModeToggle currentMode="unified" onSetMode={vi.fn()} />);
    const unifiedBtn = screen.getByText("Unified").closest("button")!;
    expect(unifiedBtn.className).toContain("bg-emerald");
  });

  it("highlights split when active", () => {
    render(<DiffViewModeToggle currentMode="split" onSetMode={vi.fn()} />);
    const splitBtn = screen.getByText("Split").closest("button")!;
    expect(splitBtn.className).toContain("bg-emerald");
  });

  it("calls onSetMode with unified when unified clicked", () => {
    const onSetMode = vi.fn();
    render(<DiffViewModeToggle currentMode="split" onSetMode={onSetMode} />);
    fireEvent.click(screen.getByText("Unified"));
    expect(onSetMode).toHaveBeenCalledWith("unified");
  });

  it("calls onSetMode with split when split clicked", () => {
    const onSetMode = vi.fn();
    render(<DiffViewModeToggle currentMode="unified" onSetMode={onSetMode} />);
    fireEvent.click(screen.getByText("Split"));
    expect(onSetMode).toHaveBeenCalledWith("split");
  });
});
