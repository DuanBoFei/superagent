import { describe, expect, it } from "vitest";
import { renderBulkActionBar } from "../../packages/web/src/components/chat/tool-grid/BulkActionBar";

// ── Button Presence ─────────────────────────────────

describe("button presence", () => {
  it("renders all four action buttons", () => {
    const html = renderBulkActionBar({ runningCount: 3, completedCount: 5, showUndo: false });
    expect(html).toContain("data-action=\"cancel-all\"");
    expect(html).toContain("data-action=\"expand-all\"");
    expect(html).toContain("data-action=\"collapse-all\"");
    expect(html).toContain("data-action=\"clear-completed\"");
  });

  it("renders with bulk-action-bar CSS class", () => {
    const html = renderBulkActionBar({ runningCount: 1, completedCount: 0, showUndo: false });
    expect(html).toContain("bulk-action-bar");
  });

  it("includes Cancel All button text", () => {
    const html = renderBulkActionBar({ runningCount: 2, completedCount: 0, showUndo: false });
    expect(html).toContain("Cancel All");
  });

  it("includes Expand All button text", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 3, showUndo: false });
    expect(html).toContain("Expand All");
  });

  it("includes Collapse All button text", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 3, showUndo: false });
    expect(html).toContain("Collapse All");
  });

  it("includes Clear Completed button text", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 2, showUndo: false });
    expect(html).toContain("Clear Completed");
  });
});

// ── Cancel All disabled state ────────────────────────

describe("cancel all disabled state", () => {
  it("disables Cancel All when no running tools", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 5, showUndo: false });
    expect(html).toContain("cancel-all-disabled");
    expect(html).toContain("disabled");
  });

  it("enables Cancel All when running tools exist", () => {
    const html = renderBulkActionBar({ runningCount: 3, completedCount: 5, showUndo: false });
    expect(html).not.toContain("cancel-all-disabled");
  });

  it("shows running count in Cancel All button", () => {
    const html = renderBulkActionBar({ runningCount: 4, completedCount: 1, showUndo: false });
    expect(html).toContain("4");
  });
});

// ── Clear Completed disabled state ───────────────────

describe("clear completed disabled state", () => {
  it("disables Clear Completed when no completed tools", () => {
    const html = renderBulkActionBar({ runningCount: 3, completedCount: 0, showUndo: false });
    expect(html).toContain("clear-completed-disabled");
    expect(html).toContain("disabled");
  });

  it("enables Clear Completed when completed tools exist", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 5, showUndo: false });
    expect(html).not.toContain("clear-completed-disabled");
  });
});

// ── Undo Mechanism ───────────────────────────────────

describe("undo mechanism", () => {
  it("shows undo button when showUndo is true", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 0, showUndo: true, undoRemainingSeconds: 5 });
    expect(html).toContain("data-action=\"undo-clear\"");
    expect(html).toContain("Undo");
  });

  it("shows remaining seconds in undo button", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 0, showUndo: true, undoRemainingSeconds: 3 });
    expect(html).toContain("3s");
  });

  it("does not show undo button when showUndo is false", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 5, showUndo: false });
    expect(html).not.toContain("data-action=\"undo-clear\"");
  });

  it("undo button replaces Clear Completed when visible", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 0, showUndo: true, undoRemainingSeconds: 4 });
    expect(html).not.toContain("Clear Completed");
    expect(html).toContain("Undo");
  });
});

// ── Edge Cases ──────────────────────────────────────

describe("edge cases", () => {
  it("renders with all zero counts", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 0, showUndo: false });
    expect(html).toBeTruthy();
    expect(html.length).toBeGreaterThan(0);
  });

  it("renders with large counts", () => {
    const html = renderBulkActionBar({ runningCount: 99, completedCount: 50, showUndo: false });
    expect(html).toContain("99");
    expect(html).toBeTruthy();
  });

  it("undo button shows countdown at 1 second", () => {
    const html = renderBulkActionBar({ runningCount: 0, completedCount: 0, showUndo: true, undoRemainingSeconds: 1 });
    expect(html).toContain("1s");
  });
});
