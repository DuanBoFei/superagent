import { describe, expect, it } from "vitest";
import { renderSortFilterControls } from "../../packages/web/src/components/chat/tool-grid/SortFilterControls";
import type { SortField, SortOrder, StatusFilter } from "../../packages/web/src/types/tool-grid";

// ── Sort Controls ────────────────────────────────────

describe("sort controls", () => {
  it("renders sort select with all sort fields", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "all" });
    expect(html).toContain("data-action=\"sort-by\"");
    expect(html).toContain("Status");
    expect(html).toContain("Duration");
    expect(html).toContain("Name");
  });

  it("marks current sort field as selected", () => {
    const html = renderSortFilterControls({ sortBy: "duration", sortOrder: "asc", filterStatus: "all" });
    expect(html).toContain("data-sort-selected=\"duration\"");
  });

  it("renders sort direction toggle", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "all" });
    expect(html).toContain("data-action=\"toggle-sort-order\"");
  });

  it("shows asc direction indicator", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "all" });
    expect(html).toContain("sort-order-asc");
  });

  it("shows desc direction indicator", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "desc", filterStatus: "all" });
    expect(html).toContain("sort-order-desc");
  });

  it("sort direction toggle shows aria-label", () => {
    const html = renderSortFilterControls({ sortBy: "name", sortOrder: "asc", filterStatus: "all" });
    expect(html).toContain("aria-label=");
  });
});

// ── Filter Controls ──────────────────────────────────

describe("filter controls", () => {
  it("renders filter buttons for all status options", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "all" });
    expect(html).toContain("data-action=\"filter-by\"");
    expect(html).toContain("All");
    expect(html).toContain("Running");
    expect(html).toContain("Failed");
    expect(html).toContain("Completed");
  });

  it("marks current filter as active", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "running" });
    expect(html).toContain("filter-active-running");
  });

  it("marks 'all' filter as active by default", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "all" });
    expect(html).toContain("filter-active-all");
  });

  it("marks 'failed' filter as active", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "failed" });
    expect(html).toContain("filter-active-failed");
  });

  it("marks 'completed' filter as active", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "completed" });
    expect(html).toContain("filter-active-completed");
  });

  it("each filter button has data-filter-value attribute", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "all" });
    expect(html).toContain('data-filter-value="all"');
    expect(html).toContain('data-filter-value="running"');
    expect(html).toContain('data-filter-value="failed"');
    expect(html).toContain('data-filter-value="completed"');
  });
});

// ── Wrapper Structure ────────────────────────────────

describe("wrapper structure", () => {
  it("renders with sort-filter-controls CSS class", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "all" });
    expect(html).toContain("sort-filter-controls");
  });

  it("has separate sort section and filter section", () => {
    const html = renderSortFilterControls({ sortBy: "status", sortOrder: "asc", filterStatus: "all" });
    expect(html).toContain("sort-controls-section");
    expect(html).toContain("filter-controls-section");
  });
});

// ── All Combinations ─────────────────────────────────

describe("all sort + filter combinations", () => {
  const sortFields: SortField[] = ["status", "duration", "name"];
  const sortOrders: SortOrder[] = ["asc", "desc"];
  const filters: StatusFilter[] = ["all", "running", "failed", "completed"];

  it("renders without crashing for all combinations", () => {
    for (const sortBy of sortFields) {
      for (const sortOrder of sortOrders) {
        for (const filterStatus of filters) {
          const html = renderSortFilterControls({ sortBy, sortOrder, filterStatus });
          expect(html).toBeTruthy();
          expect(typeof html).toBe("string");
          expect(html.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
