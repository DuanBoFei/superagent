import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionDeleteConfirm, UndoToast } from "./session-delete-confirm";

describe("SessionDeleteConfirm", () => {
  describe("single mode", () => {
    it("renders session title in confirm message", () => {
      render(
        <SessionDeleteConfirm
          mode="single"
          sessionTitle="Fix auth bug"
        />,
      );
      expect(screen.getByText(/Delete "Fix auth bug"/)).toBeDefined();
    });

    it("shows cannot be undone message", () => {
      render(<SessionDeleteConfirm mode="single" sessionTitle="Test" />);
      expect(screen.getByText("This action cannot be undone.")).toBeDefined();
    });

    it("calls onConfirm when delete button clicked", () => {
      const onConfirm = vi.fn();
      render(
        <SessionDeleteConfirm
          mode="single"
          sessionTitle="Test"
          onConfirm={onConfirm}
        />,
      );
      fireEvent.click(screen.getByText("Delete"));
      expect(onConfirm).toHaveBeenCalled();
    });

    it("calls onCancel when cancel clicked", () => {
      const onCancel = vi.fn();
      render(
        <SessionDeleteConfirm
          mode="single"
          sessionTitle="Test"
          onCancel={onCancel}
        />,
      );
      fireEvent.click(screen.getByText("Cancel"));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("bulk mode", () => {
    it("renders session count", () => {
      render(<SessionDeleteConfirm mode="bulk" sessionCount={5} />);
      expect(screen.getByText(/Delete 5 selected sessions/)).toBeDefined();
    });
  });

  describe("clearAll mode", () => {
    it("renders warning text", () => {
      render(<SessionDeleteConfirm mode="clearAll" />);
      expect(screen.getByText(/permanently delete ALL sessions/i)).toBeDefined();
    });

    it("disables delete button until DELETE is typed", () => {
      render(<SessionDeleteConfirm mode="clearAll" />);
      const btn = screen.getByText("Delete").closest("button") as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it("enables delete button after typing DELETE", () => {
      render(<SessionDeleteConfirm mode="clearAll" />);
      const input = screen.getByPlaceholderText("DELETE");
      fireEvent.change(input, { target: { value: "DELETE" } });
      const btn = screen.getByText("Delete").closest("button") as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it("confirms on Enter key with correct input", () => {
      const onConfirm = vi.fn();
      render(<SessionDeleteConfirm mode="clearAll" onConfirm={onConfirm} />);
      const input = screen.getByPlaceholderText("DELETE");
      fireEvent.change(input, { target: { value: "DELETE" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  describe("Escape key", () => {
    it("calls onCancel on Escape", () => {
      const onCancel = vi.fn();
      render(
        <SessionDeleteConfirm
          mode="single"
          sessionTitle="Test"
          onCancel={onCancel}
        />,
      );
      fireEvent.keyDown(document, { key: "Escape" });
      expect(onCancel).toHaveBeenCalled();
    });
  });
});

describe("UndoToast", () => {
  it("renders nothing when not visible", () => {
    const { container } = render(
      <UndoToast message="Deleted" remainingSeconds={5} visible={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders message when visible", () => {
    render(
      <UndoToast message="Session deleted" remainingSeconds={5} visible={true} />,
    );
    expect(screen.getByText("Session deleted")).toBeDefined();
  });

  it("shows remaining seconds", () => {
    render(
      <UndoToast message="Deleted" remainingSeconds={3} visible={true} />,
    );
    expect(screen.getByText("3")).toBeDefined();
  });

  it("calls onUndo when undo clicked", () => {
    const onUndo = vi.fn();
    render(
      <UndoToast
        message="Deleted"
        remainingSeconds={5}
        visible={true}
        onUndo={onUndo}
      />,
    );
    fireEvent.click(screen.getByText("Undo"));
    expect(onUndo).toHaveBeenCalled();
  });

  it("calls onDismiss when dismiss clicked", () => {
    const onDismiss = vi.fn();
    render(
      <UndoToast
        message="Deleted"
        remainingSeconds={5}
        visible={true}
        onDismiss={onDismiss}
      />,
    );
    const dismissBtn = screen.getByLabelText("Dismiss");
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalled();
  });
});
