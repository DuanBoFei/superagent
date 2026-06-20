/**
 * ⑥ L4 Cross-browser + responsive Playwright tests for 031 ToolGrid.
 *
 * Viewport geometry invariants + visual regression at multiple viewports.
 * Pure function tests for calculateColumns() are in tool-grid-calculate-columns.test.ts.
 *
 * FR-GRID-01: 1/2/3 column responsive layout
 * FR-GRID-18: <600px auto-switch to list view
 *
 * Run: npx playwright test tests/web/tool-grid-responsive.pwtest.ts
 */

import { test, expect } from "@playwright/test";

const VIEWPORTS = {
  desktopWide: { width: 1920, height: 1080 },
  desktop: { width: 1280, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 500, height: 896 },
};

test.describe("⑥ L4 ToolGrid — responsive geometry", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tool-grid");
    await page.waitForTimeout(1500);
  });

  // ── Geometric invariants ─────────────────────────────

  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`no horizontal scrollbar at ${name} (${size.width}x${size.height})`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
    });
  }

  // ── Container fits within viewport ───────────────────

  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`container fits within viewport at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);

      const container = page.locator(".container");
      const box = await container.boundingBox();
      if (box) {
        const viewport = page.viewportSize();
        expect(box.width).toBeLessThanOrEqual(viewport!.width + 1);
      }
    });
  }

  // ── Cards don't overlap ──────────────────────────────

  test("grid cards do not overlap at any viewport", async ({ page }) => {
    for (const [name, size] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);

      const cards = page.locator(".tool-card");
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        const box = await cards.nth(i).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        if (i > 0) {
          const prevBox = await cards.nth(i - 1).boundingBox();
          if (prevBox) {
            expect(box!.y).toBeGreaterThanOrEqual(prevBox.y + prevBox.height - 1);
          }
        }
      }
    }
  });

  // ── Grid cards rendered correctly ────────────────────

  test("grid container cards are visible at desktop", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    const gridSection = page.locator("h1:has-text('3-Column Grid')");
    await gridSection.scrollIntoViewIfNeeded();
    await expect(gridSection).toBeVisible();

    const gridCards = page.locator('[data-tool-id^="grid-t"]');
    const count = await gridCards.count();
    expect(count).toBeGreaterThanOrEqual(9);
  });

  test("all fixture sections are visible at each viewport", async ({ page }) => {
    for (const [name, size] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(size);
      await page.waitForTimeout(400);

      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);

      const titles = page.locator(".section-title");
      const titleCount = await titles.count();
      expect(titleCount).toBeGreaterThanOrEqual(20);
    }
  });

  // ── Visual regression at multiple viewports ───────────

  test("full fixture page screenshot at desktop (1280px)", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("toolgrid-responsive-desktop.png", { fullPage: true });
  });

  test("full fixture page screenshot at tablet (768px)", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("toolgrid-responsive-tablet.png", { fullPage: true });
  });

  test("full fixture page screenshot at mobile (500px)", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("toolgrid-responsive-mobile.png", { fullPage: true });
  });

  // ── Firefox cross-browser ────────────────────────────

  test("firefox renders ToolGrid fixture without layout breakage", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    const cardCount = await page.locator(".tool-card").count();
    expect(cardCount).toBeGreaterThanOrEqual(10);

    const brokenElements = await page.evaluate(() => {
      const all = document.querySelectorAll("*");
      const broken: string[] = [];
      all.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 0 || rect.height < 0) {
          broken.push(`${el.tagName}.${el.className}`);
        }
      });
      return broken;
    });
    expect(broken).toHaveLength(0);
  });

  test("firefox dark theme renders correctly on ToolGrid fixture", async ({ page }) => {
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // Dark theme: #0a0a0a = rgb(10, 10, 10)
    expect(bgColor).toMatch(/rgb\(\s*(?:1[0-2]|[0-9])\s*,\s*(?:1[0-2]|[0-9])\s*,\s*(?:1[0-2]|[0-9])\s*\)/);
  });
});
