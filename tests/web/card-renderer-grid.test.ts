import { describe, expect, it } from "vitest";
import { createCardRegistry } from "../../packages/web/src/components/chat/cards/CardRegistry";
import { renderCardsGrid, type GridOptions } from "../../packages/web/src/components/chat/cards/CardRenderer";
import type { BashCard, GlobCard, ToolCardState } from "../../packages/web/src/types/cards";

// ── Helpers ────────────────────────────────────────

function bashCard(overrides: Partial<BashCard> = {}): BashCard {
  return {
    id: "bash_1",
    type: "bash",
    status: "success",
    timestamp: 1_720_000_000_000,
    title: "npm install",
    isExpanded: true,
    isCollapsible: true,
    content: { command: "npm", args: ["install"], output: "done", exitCode: 0, durationMs: 1200 },
    ...overrides,
  } as BashCard;
}

function globCard(overrides: Partial<GlobCard> = {}): GlobCard {
  return {
    id: "glob_1",
    type: "glob",
    status: "success",
    timestamp: 1_720_000_000_000,
    title: "Glob: **/*.ts",
    isExpanded: false,
    isCollapsible: true,
    content: { pattern: "**/*.ts", files: ["a.ts", "b.ts"], totalFiles: 2 },
    ...overrides,
  } as GlobCard;
}

function mockRegistry() {
  const registry = createCardRegistry();
  registry.register("bash", (card) => `<div class="bash-card">${(card as BashCard).content.command}</div>`);
  registry.register("glob", (card) => `<div class="glob-card">${(card as GlobCard).content.pattern}</div>`);
  return registry;
}

function basicOpts(overrides: Partial<GridOptions> = {}): GridOptions {
  return {
    containerWidth: 1024,
    viewMode: "grid",
    sortBy: "status",
    sortOrder: "asc",
    filterStatus: "all",
    ...overrides,
  };
}

// ── Empty / Single ──────────────────────────────────

describe("empty and single card", () => {
  it("returns empty string for no cards", () => {
    const html = renderCardsGrid([], mockRegistry(), basicOpts());
    expect(html).toBe("");
  });

  it("delegates to renderCards for single tool (backward compat)", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [bashCard()];
    const html = renderCardsGrid(cards, registry, basicOpts());

    // Should use the old card-stack layout, not tool-grid wrapper
    expect(html).toContain("card-stack");
    expect(html).not.toContain("tool-grid");
    expect(html).toContain("bash-card");
  });
});

// ── Grid Layout ─────────────────────────────────────

describe("grid layout for multiple cards", () => {
  it("renders tool-grid wrapper when 2+ tools", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [bashCard(), globCard()];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("tool-grid");
    expect(html).toContain("view-mode-grid");
    expect(html).not.toContain("card-stack");
  });

  it("renders grid-cols-2 for 3-4 tools at width 800", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [
      bashCard({ id: "a" }), bashCard({ id: "b" }), bashCard({ id: "c" }),
    ];
    const html = renderCardsGrid(cards, registry, basicOpts({ containerWidth: 800 }));
    expect(html).toContain("grid-cols-2");
  });

  it("renders grid-cols-3 for 5+ tools at width 1200", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = Array.from({ length: 5 }, (_, i) =>
      bashCard({ id: `t${i}` })
    );
    const html = renderCardsGrid(cards, registry, basicOpts({ containerWidth: 1200 }));
    expect(html).toContain("grid-cols-3");
  });

  it("forces grid-cols-1 in list view mode", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [bashCard(), globCard(), bashCard({ id: "b2" })];
    const html = renderCardsGrid(cards, registry, basicOpts({ viewMode: "list" }));
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("view-mode-list");
  });
});

// ── Card Rendering ──────────────────────────────────

describe("card rendering within grid", () => {
  it("renders each card with its registry renderer", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [bashCard({ id: "a" }), globCard({ id: "b" })];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("bash-card");
    expect(html).toContain("glob-card");
  });

  it("preserves data-card-id on each card", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [bashCard({ id: "c1" }), bashCard({ id: "c2" })];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain('data-card-id="c1"');
    expect(html).toContain('data-card-id="c2"');
  });

  it("includes card header for each card", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [bashCard({ title: "My Command" })];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("My Command");
  });

  it("marks collapsed cards", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [
      bashCard({ id: "a", isExpanded: false }),
      globCard({ id: "b", isExpanded: false }),
    ];
    const html = renderCardsGrid(cards, registry, basicOpts());

    const collapsedCount = html.split("card-collapsed").length - 1;
    expect(collapsedCount).toBe(2);
  });
});

// ── Grid Controls ───────────────────────────────────

describe("grid controls", () => {
  it("renders BulkActionBar", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [bashCard(), globCard()];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("bulk-action-bar");
    expect(html).toContain("Expand All");
    expect(html).toContain("Collapse All");
  });

  it("computes running count from pending+running cards", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [
      bashCard({ id: "a", status: "running" }),
      bashCard({ id: "b", status: "pending" }),
      globCard({ id: "c", status: "success" }),
    ];
    const html = renderCardsGrid(cards, registry, basicOpts());

    // running + pending = 2
    expect(html).toContain("Cancel All (2)");
  });

  it("computes completed count from success+error cards", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [
      bashCard({ id: "a", status: "success" }),
      bashCard({ id: "b", status: "error" }),
      bashCard({ id: "c", status: "running" }),
    ];
    const html = renderCardsGrid(cards, registry, basicOpts());

    // success + error = 2 (counted as "completed" for Clear Completed)
    expect(html).toContain("Clear Completed");
    // Cancel All should show running count (1)
    expect(html).toContain("Cancel All (1)");
  });

  it("renders SortFilterControls", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [bashCard(), globCard()];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("sort-filter-controls");
    expect(html).toContain('data-action="sort-by"');
  });

  it("renders ViewToggle", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [bashCard(), globCard()];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("view-toggle");
    expect(html).toContain('data-action="set-view-grid"');
    expect(html).toContain('data-action="set-view-list"');
  });
});

// ── Error Aggregation ───────────────────────────────

describe("error aggregation", () => {
  it("renders error panel when cards have error status", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [
      bashCard({ id: "e1", status: "error", title: "bash fail" }),
      globCard({ id: "ok", status: "success" }),
    ];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("error-banner");
    expect(html).toContain("bash fail");
  });

  it("does not render error panel when no errors", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [
      bashCard({ id: "a", status: "success" }),
      globCard({ id: "b", status: "running" }),
    ];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).not.toContain("error-banner");
  });

  it("renders correct error count", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [
      bashCard({ id: "e1", status: "error", title: "A" }),
      bashCard({ id: "e2", status: "error", title: "B" }),
    ];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("2 errors");
  });
});

// ── Virtual Scroll ──────────────────────────────────

describe("virtual scroll integration", () => {
  it("enables virtual scroll when more than 20 tools", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = Array.from({ length: 25 }, (_, i) =>
      bashCard({ id: `t${i}` })
    );
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("virtual-scroll-container");
  });

  it("no virtual scroll when 20 or fewer tools", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = Array.from({ length: 20 }, (_, i) =>
      bashCard({ id: `t${i}` })
    );
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).not.toContain("virtual-scroll-container");
  });
});

// ── Edge Cases ──────────────────────────────────────

describe("edge cases", () => {
  it("all cards running shows Cancel All but disabled Clear Completed", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [
      bashCard({ id: "a", status: "running" }),
      globCard({ id: "b", status: "running" }),
    ];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("Cancel All (2)");
    expect(html).toContain("clear-completed-disabled");
  });

  it("all cards completed shows disabled Cancel All with active Clear Completed", () => {
    const registry = mockRegistry();
    const cards: ToolCardState[] = [
      bashCard({ id: "a", status: "success" }),
      globCard({ id: "b", status: "error" }),
    ];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("cancel-all-disabled");
    // Clear Completed should NOT be disabled (completedCount > 0)
    expect(html).not.toContain("clear-completed-disabled");
  });

  it("handles unknown card types via fallback", () => {
    const registry = createCardRegistry();
    // No registrations — all cards fallback
    const cards: ToolCardState[] = [bashCard(), globCard()];
    const html = renderCardsGrid(cards, registry, basicOpts());

    expect(html).toContain("card-fallback");
  });
});
