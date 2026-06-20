/**
 * ⑤ Visual regression — Playwright screenshot tests for all card types.
 *
 * Takes screenshots of each card type and compares against baselines.
 * Requires: npx playwright install chromium firefox
 *
 * Run: npx playwright test tests/web/visual-regression.test.ts
 */

import { test, expect } from "@playwright/test";

test.describe("⑤ Visual regression — card screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for Tailwind CDN to apply styles
    await page.waitForTimeout(1500);
  });

  test("all 9 card types + error card — full page screenshot", async ({ page }) => {
    await expect(page).toHaveScreenshot("all-cards-full-page.png", {
      fullPage: true,
    });
  });

  test("bash success card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-bash-ok"]');
    await expect(card).toHaveScreenshot("bash-card-success.png");
  });

  test("bash error card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-bash-err"]');
    await expect(card).toHaveScreenshot("bash-card-error.png");
  });

  test("file read card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-read"]');
    await expect(card).toHaveScreenshot("file-read-card.png");
  });

  test("file write card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-write"]');
    await expect(card).toHaveScreenshot("file-write-card.png");
  });

  test("file edit card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-edit"]');
    await expect(card).toHaveScreenshot("file-edit-card.png");
  });

  test("grep card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-grep"]');
    await expect(card).toHaveScreenshot("grep-card.png");
  });

  test("glob card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-glob"]');
    await expect(card).toHaveScreenshot("glob-card.png");
  });

  test("task list card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-tasks"]');
    await expect(card).toHaveScreenshot("task-list-card.png");
  });

  test("sub-agent grid card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-agents"]');
    await expect(card).toHaveScreenshot("sub-agent-grid-card.png");
  });

  test("web search card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-search"]');
    await expect(card).toHaveScreenshot("web-search-card.png");
  });

  test("error card — standalone", async ({ page }) => {
    const card = page.locator('[data-card-id="card-error"]');
    await expect(card).toHaveScreenshot("error-card.png");
  });

  test("all cards collapsed state", async ({ page }) => {
    // Scroll to the collapsed section
    const section = page.locator("h1:has-text('All cards — Collapsed')");
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot("all-cards-collapsed.png", {
      fullPage: true,
    });
  });
});
