import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BulkActionBar } from "./BulkActionBar";

describe("BulkActionBar", () => {
  const defaultProps = {
    runningCount: 2,
    completedCount: 3,
    showUndo: false,
    onCancelAll: vi.fn(),
    onExpandAll: vi.fn(),
    onCollapseAll: vi.fn(),
    onClearCompleted: vi.fn(),
    onUndoClear: vi.fn(),
  };

  it("renders Cancel All with count", () => {
    render(<BulkActionBar {...defaultProps} />);
    expect(screen.getByText("Cancel All (2)")).toBeDefined();
  });

  it("disables Cancel All when runningCount is 0", () => {
    render(<BulkActionBar {...defaultProps} runningCount={0} />);
    const btn = screen.getByText("Cancel All");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders Expand All and Collapse All", () => {
    render(<BulkActionBar {...defaultProps} />);
    expect(screen.getByText("Expand All")).toBeDefined();
    expect(screen.getByText("Collapse All")).toBeDefined();
  });

  it("renders Clear Completed button when not showing undo", () => {
    render(<BulkActionBar {...defaultProps} />);
    expect(screen.getByText("Clear Completed")).toBeDefined();
  });

  it("disables Clear Completed when completedCount is 0", () => {
    render(<BulkActionBar {...defaultProps} completedCount={0} />);
    const btn = screen.getByText("Clear Completed");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders Undo button when showUndo is true", () => {
    render(<BulkActionBar {...defaultProps} showUndo={true} undoRemainingSeconds={3} />);
    expect(screen.getByText("Undo (3s)")).toBeDefined();
  });

  it("fires onCancelAll when Cancel All clicked", () => {
    const onCancelAll = vi.fn();
    render(<BulkActionBar {...defaultProps} onCancelAll={onCancelAll} />);
    fireEvent.click(screen.getByText("Cancel All (2)"));
    expect(onCancelAll).toHaveBeenCalledOnce();
  });

  it("fires onExpandAll when Expand All clicked", () => {
    const onExpandAll = vi.fn();
    render(<BulkActionBar {...defaultProps} onExpandAll={onExpandAll} />);
    fireEvent.click(screen.getByText("Expand All"));
    expect(onExpandAll).toHaveBeenCalledOnce();
  });

  it("fires onCollapseAll when Collapse All clicked", () => {
    const onCollapseAll = vi.fn();
    render(<BulkActionBar {...defaultProps} onCollapseAll={onCollapseAll} />);
    fireEvent.click(screen.getByText("Collapse All"));
    expect(onCollapseAll).toHaveBeenCalledOnce();
  });

  it("fires onClearCompleted when Clear Completed clicked", () => {
    const onClearCompleted = vi.fn();
    render(<BulkActionBar {...defaultProps} onClearCompleted={onClearCompleted} />);
    fireEvent.click(screen.getByText("Clear Completed"));
    expect(onClearCompleted).toHaveBeenCalledOnce();
  });

  it("fires onUndoClear when Undo button clicked", () => {
    const onUndoClear = vi.fn();
    render(<BulkActionBar {...defaultProps} showUndo={true} onUndoClear={onUndoClear} />);
    fireEvent.click(screen.getByText("Undo (5s)"));
    expect(onUndoClear).toHaveBeenCalledOnce();
  });
});
