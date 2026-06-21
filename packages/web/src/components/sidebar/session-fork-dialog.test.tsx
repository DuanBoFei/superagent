import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionForkDialog } from "./session-fork-dialog";

describe("SessionForkDialog", () => {
  it("renders fork title input", () => {
    render(
      <SessionForkDialog
        sourceTitle="My Session"
        messageIndex={3}
        totalMessages={10}
      />,
    );
    const input = screen.getByDisplayValue(/Fork of/);
    expect(input).toBeDefined();
  });

  it("shows message range", () => {
    render(
      <SessionForkDialog
        sourceTitle="My Session"
        messageIndex={4}
        totalMessages={20}
      />,
    );
    expect(screen.getByText(/messages 1–5 of 20/)).toBeDefined();
  });

  it("calls onConfirm with title on Enter", () => {
    const onConfirm = vi.fn();
    render(
      <SessionForkDialog
        sourceTitle="Source"
        messageIndex={3}
        totalMessages={10}
        onConfirm={onConfirm}
      />,
    );
    const input = screen.getByDisplayValue("Fork of \"Source\"");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledWith("Fork of \"Source\"");
  });

  it("calls onCancel on cancel button click", () => {
    const onCancel = vi.fn();
    render(
      <SessionForkDialog
        sourceTitle="Source"
        messageIndex={3}
        totalMessages={10}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel on Escape key", () => {
    const onCancel = vi.fn();
    render(
      <SessionForkDialog
        sourceTitle="Source"
        messageIndex={3}
        totalMessages={10}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onConfirm on Create Fork button click", () => {
    const onConfirm = vi.fn();
    render(
      <SessionForkDialog
        sourceTitle="Source"
        messageIndex={3}
        totalMessages={10}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByText("Create Fork"));
    expect(onConfirm).toHaveBeenCalledWith("Fork of \"Source\"");
  });
});
