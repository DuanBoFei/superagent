/**
 * T016 [INT] · App Shell visual regression — Playwright screenshot tests.
 *
 * Covers the T016 Playwright visual snapshot requirements:
 *   - App shell layout (empty state via /)
 *   - Message bubbles
 *   - Tool card grid
 *   - Diff view
 *   - Terminal output
 *   - Sidebar
 *
 * Run: npx playwright test tests/web/app-shell.pwtest.ts
 * Update snapshots: npx playwright test tests/web/app-shell.pwtest.ts --update-snapshots
 */

import { test, expect } from "@playwright/test";

const FIXTURE_URL = "/fixtures";

test.describe("T016 App Shell — visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE_URL);
    // Wait for Tailwind + fonts to fully apply
    await page.waitForTimeout(2000);
  });

  // ── Full-page screenshot ──────────────────────────────

  test("full fixtures page", async ({ page }) => {
    await expect(page).toHaveScreenshot("app-shell-fixtures-full.png", {
      fullPage: true,
    });
  });

  // ── Section 1: Message bubbles ────────────────────────

  test("message bubbles — user + assistant with markdown", async ({ page }) => {
    const section = page.locator('[data-fixture="messages"]');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(section).toHaveScreenshot("app-shell-message-bubbles.png");
  });

  // ── Section 2: Empty chat state ───────────────────────

  test("empty chat state", async ({ page }) => {
    const section = page.locator('[data-fixture="empty-chat"]');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(section).toHaveScreenshot("app-shell-empty-chat.png");
  });

  // ── Section 3: Tool card grid ─────────────────────────

  test("tool card grid — mixed statuses", async ({ page }) => {
    const section = page.locator('[data-fixture="tool-grid"]');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(section).toHaveScreenshot("app-shell-tool-grid.png");
  });

  // ── Section 4: Diff view ──────────────────────────────

  test("diff view — unified with additions/deletions", async ({ page }) => {
    const section = page.locator('[data-fixture="diff"]');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(section).toHaveScreenshot("app-shell-diff-view.png");
  });

  // ── Section 5: Terminal ANSI output ───────────────────

  test("terminal — ANSI colored output", async ({ page }) => {
    const section = page.locator('[data-fixture="terminal"]');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(section).toHaveScreenshot("app-shell-terminal-output.png");
  });

  // ── Section 6: Terminal collapsed ─────────────────────

  test("terminal — collapsed long output", async ({ page }) => {
    const section = page.locator('[data-fixture="terminal-collapsed"]');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(section).toHaveScreenshot("app-shell-terminal-collapsed.png");
  });

  // ── Section 7: Sidebar ────────────────────────────────

  test("sidebar — session list docked", async ({ page }) => {
    const section = page.locator('[data-fixture="sidebar"]');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(section).toHaveScreenshot("app-shell-sidebar.png");
  });

  // ── App shell layout via real page (/) ────────────────

  test("app shell — real page layout at /", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("app-shell-layout.png", {
      fullPage: true,
    });
  });
});
