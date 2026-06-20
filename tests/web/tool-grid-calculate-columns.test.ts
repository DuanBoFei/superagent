/**
 * ⑥ L4 · calculateColumns() pure function fire-break tests.
 *
 * FR-GRID-01: 1/2/3 column responsive layout
 * FR-GRID-18: <600px auto-switch to 1 column (list-equivalent)
 *
 * Run: npx vitest run tests/web/tool-grid-calculate-columns.test.ts
 */

import { describe, expect, it } from "vitest";
import { calculateColumns } from "../../packages/web/src/types/tool-grid";

describe("⑥ L4 · calculateColumns() pure function", () => {
  // ── 3-column ─────────────────────────────────────────

  it("returns 3 columns for 9 tools in grid view at 1400px", () => {
    expect(calculateColumns(9, "grid", 1400)).toBe(3);
  });

  it("returns 3 columns for 5 tools in grid view at 1200px", () => {
    expect(calculateColumns(5, "grid", 1200)).toBe(3);
  });

  it("returns 3 columns for 20 tools in grid view at 1920px", () => {
    expect(calculateColumns(20, "grid", 1920)).toBe(3);
  });

  // ── 2-column ─────────────────────────────────────────

  it("returns 2 columns for 4 tools in grid view at 900px", () => {
    expect(calculateColumns(4, "grid", 900)).toBe(2);
  });

  it("returns 2 columns for 3 tools in grid view at 800px", () => {
    expect(calculateColumns(3, "grid", 800)).toBe(2);
  });

  // ── 1-column (low tool count) ────────────────────────

  it("returns 1 column for 2 tools in grid view at 1200px (toolCount <= 2)", () => {
    expect(calculateColumns(2, "grid", 1200)).toBe(1);
  });

  it("returns 1 column for 1 tool in grid view at 1920px", () => {
    expect(calculateColumns(1, "grid", 1920)).toBe(1);
  });

  it("returns 1 column for 0 tools in grid view at 1400px", () => {
    expect(calculateColumns(0, "grid", 1400)).toBe(1);
  });

  // ── FR-GRID-18: <600px forces 1 column ───────────────

  it("returns 1 column for 9 tools at 599px (below 600px threshold)", () => {
    expect(calculateColumns(9, "grid", 599)).toBe(1);
  });

  it("returns 1 column for 9 tools at 500px", () => {
    expect(calculateColumns(9, "grid", 500)).toBe(1);
  });

  it("returns 3 columns at exactly 600px (threshold is < 600, not <=)", () => {
    expect(calculateColumns(9, "grid", 600)).toBe(3);
  });

  it("returns 3 columns at 601px (just above threshold, >= 5 tools)", () => {
    expect(calculateColumns(9, "grid", 601)).toBe(3);
  });

  // ── List view always 1 column ────────────────────────

  it("returns 1 column for 9 tools in list view at 1400px", () => {
    expect(calculateColumns(9, "list", 1400)).toBe(1);
  });

  it("returns 1 column for 3 tools in list view at 1920px", () => {
    expect(calculateColumns(3, "list", 1920)).toBe(1);
  });

  // ── Boundary: type-level GridColumns return ───────────

  it("always returns 1, 2, or 3 (type-safe across range)", () => {
    const widths = [0, 300, 500, 599, 600, 601, 768, 900, 1024, 1280, 1400, 1920, 2560];
    const modes: Array<"grid" | "list"> = ["grid", "list"];
    for (const w of widths) {
      for (const m of modes) {
        const cols = calculateColumns(10, m, w);
        expect([1, 2, 3]).toContain(cols);
      }
    }
  });
});
