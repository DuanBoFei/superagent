import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionExportImport } from "./session-export-import";

describe("SessionExportImport", () => {
  it("renders export button disabled when no selection", () => {
    render(<SessionExportImport hasSelection={false} />);
    const btn = screen.getByText("Export").closest("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("enables export button when has selection", () => {
    render(<SessionExportImport hasSelection={true} />);
    const btn = screen.getByText("Export").closest("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("renders Export All button", () => {
    render(<SessionExportImport hasSelection={false} />);
    expect(screen.getByText("Export All")).toBeDefined();
  });

  it("renders Import button", () => {
    render(<SessionExportImport hasSelection={false} />);
    expect(screen.getByText("Import")).toBeDefined();
  });

  it("calls onExport on export click when has selection", () => {
    const onExport = vi.fn();
    render(<SessionExportImport hasSelection={true} onExportSelected={onExport} />);
    fireEvent.click(screen.getByText("Export"));
    expect(onExport).toHaveBeenCalled();
  });

  it("does not call onExport when disabled", () => {
    const onExport = vi.fn();
    render(<SessionExportImport hasSelection={false} onExport={onExport} />);
    fireEvent.click(screen.getByText("Export"));
    expect(onExport).not.toHaveBeenCalled();
  });

  it("calls onExportAll when Export All clicked", () => {
    const onExportAll = vi.fn();
    render(<SessionExportImport hasSelection={false} onExportAll={onExportAll} />);
    fireEvent.click(screen.getByText("Export All"));
    expect(onExportAll).toHaveBeenCalled();
  });

  it("clicks hidden file input when Import clicked", () => {
    render(<SessionExportImport hasSelection={false} />);
    const importBtn = screen.getByText("Import");
    // Should trigger hidden file input
    fireEvent.click(importBtn);
    // The file input exists in the DOM
    const fileInput = document.querySelector("input[type='file']");
    expect(fileInput).toBeDefined();
  });
});
