/**
 * ⑤ L2 Visual regression — Playwright screenshot tests for 031 ToolGrid components.
 *
 * Covers: ToolCard (5 statuses), ToolGrid (1/2/3 cols, list, errors, empty),
 * BulkActionBar, SortFilterControls, ViewToggle, ResourceBarChart, ErrorAggregationPanel.
 *
 * Run: npx playwright test tests/web/tool-grid-visual-regression.pwtest.ts
 * Update snapshots: npx playwright test tests/web/tool-grid-visual-regression.pwtest.ts --update-snapshots
 */

import { test, expect } from "@playwright/test";

test.describe("⑤ L2 Visual regression — ToolGrid components", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tool-grid");
    await page.waitForTimeout(1500);
  });

  // ── ToolCard: all 5 statuses ──────────────────────────

  test("ToolCard — pending state", async ({ page }) => {
    const card = page.locator('[data-tool-id="card-pending"]');
    await expect(card).toHaveScreenshot("toolcard-pending.png");
  });

  test("ToolCard — running state", async ({ page }) => {
    const card = page.locator('[data-tool-id="card-running"]');
    await expect(card).toHaveScreenshot("toolcard-running.png");
  });

  test("ToolCard — success state", async ({ page }) => {
    const card = page.locator('[data-tool-id="card-success"]');
    await expect(card).toHaveScreenshot("toolcard-success.png");
  });

  test("ToolCard — failed state", async ({ page }) => {
    const card = page.locator('[data-tool-id="card-failed"]');
    await expect(card).toHaveScreenshot("toolcard-failed.png");
  });

  test("ToolCard — cancelled state", async ({ page }) => {
    const card = page.locator('[data-tool-id="card-cancelled"]');
    await expect(card).toHaveScreenshot("toolcard-cancelled.png");
  });

  test("ToolCard — all 5 statuses full section", async ({ page }) => {
    // Scroll to the expanded cards section and capture it
    const section = page.locator("h1:has-text('ToolCard — All 5 Statuses (Expanded)')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("toolcard-all-statuses.png", { fullPage: true });
  });

  test("ToolCard — all 5 collapsed", async ({ page }) => {
    const section = page.locator("h1:has-text('ToolCard — All 5 Statuses (Collapsed)')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("toolcard-all-collapsed.png", { fullPage: true });
  });

  // ── ToolGrid: grid layouts ────────────────────────────

  test("ToolGrid — 3-column grid layout", async ({ page }) => {
    const section = page.locator("h1:has-text('ToolGrid — 3-Column')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("toolgrid-3col.png", { fullPage: true });
  });

  test("ToolGrid — 2-column grid layout", async ({ page }) => {
    const section = page.locator("h1:has-text('ToolGrid — 2-Column')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("toolgrid-2col.png", { fullPage: true });
  });

  test("ToolGrid — 1-column layout", async ({ page }) => {
    const section = page.locator("h1:has-text('ToolGrid — 1-Column')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("toolgrid-1col.png", { fullPage: true });
  });

  test("ToolGrid — list view", async ({ page }) => {
    const section = page.locator("h1:has-text('ToolGrid — List View')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("toolgrid-list-view.png", { fullPage: true });
  });

  test("ToolGrid — with error aggregation", async ({ page }) => {
    const section = page.locator("h1:has-text('ToolGrid — With Error Aggregation')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("toolgrid-with-errors.png", { fullPage: true });
  });

  test("ToolGrid — empty state", async ({ page }) => {
    const section = page.locator("h1:has-text('ToolGrid — Empty State')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("toolgrid-empty.png", { fullPage: true });
  });

  // ── BulkActionBar ──────────────────────────────────────

  test("BulkActionBar — with running tools", async ({ page }) => {
    const section = page.locator("h1:has-text('BulkActionBar — With Running')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("bulk-action-with-running.png", { fullPage: true });
  });

  test("BulkActionBar — no running tools", async ({ page }) => {
    const section = page.locator("h1:has-text('BulkActionBar — No Running')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("bulk-action-no-running.png", { fullPage: true });
  });

  test("BulkActionBar — undo mode", async ({ page }) => {
    const section = page.locator("h1:has-text('BulkActionBar — Undo Mode')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("bulk-action-undo.png", { fullPage: true });
  });

  test("BulkActionBar — all disabled", async ({ page }) => {
    const section = page.locator("h1:has-text('BulkActionBar — Empty')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("bulk-action-all-disabled.png", { fullPage: true });
  });

  // ── SortFilterControls ─────────────────────────────────

  test("SortFilterControls — status asc / all", async ({ page }) => {
    const section = page.locator("h1:has-text('SortFilterControls — Status Asc')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("sort-filter-status-asc.png", { fullPage: true });
  });

  test("SortFilterControls — duration desc / running", async ({ page }) => {
    const section = page.locator("h1:has-text('SortFilterControls — Duration Desc')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("sort-filter-duration-desc.png", { fullPage: true });
  });

  // ── ViewToggle ─────────────────────────────────────────

  test("ViewToggle — grid active", async ({ page }) => {
    const section = page.locator("h1:has-text('ViewToggle — Grid Active')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("view-toggle-grid.png", { fullPage: true });
  });

  test("ViewToggle — list active", async ({ page }) => {
    const section = page.locator("h1:has-text('ViewToggle — List Active')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("view-toggle-list.png", { fullPage: true });
  });

  // ── ResourceBarChart ───────────────────────────────────

  test("ResourceBarChart — duration metric", async ({ page }) => {
    const section = page.locator("h1:has-text('ResourceBarChart — Duration')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("chart-duration.png", { fullPage: true });
  });

  test("ResourceBarChart — output size metric", async ({ page }) => {
    const section = page.locator("h1:has-text('ResourceBarChart — Output Size')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("chart-output-size.png", { fullPage: true });
  });

  test("ResourceBarChart — no data", async ({ page }) => {
    const section = page.locator("h1:has-text('ResourceBarChart — No Data')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("chart-no-data.png", { fullPage: true });
  });

  // ── ErrorAggregationPanel ──────────────────────────────

  test("ErrorAggregationPanel — expanded (3 errors)", async ({ page }) => {
    const section = page.locator("h1:has-text('ErrorAggregationPanel — Expanded')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("error-panel-expanded.png", { fullPage: true });
  });

  test("ErrorAggregationPanel — collapsed", async ({ page }) => {
    const section = page.locator("h1:has-text('ErrorAggregationPanel — Collapsed')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("error-panel-collapsed.png", { fullPage: true });
  });

  test("ErrorAggregationPanel — single error", async ({ page }) => {
    const section = page.locator("h1:has-text('ErrorAggregationPanel — Single')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("error-panel-single.png", { fullPage: true });
  });

  test("ToolGrid — full page screenshot", async ({ page }) => {
    await expect(page).toHaveScreenshot("toolgrid-full-page.png", { fullPage: true });
  });
});
