/**
 * ④ L4 Cross-browser + responsive geometry tests.
 *
 * Validates that cards render correctly across browsers and viewports.
 * Asserts geometric invariants (no horizontal scrollbar, consistent layout).
 *
 * Requires: npx playwright install chromium firefox
 * Run: npx playwright test --project=chromium-desktop --project=firefox-desktop --project=chromium-mobile --project=chromium-tablet tests/web/cross-browser-responsive.test.ts
 */

import { test, expect } from "@playwright/test";

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
};

test.describe("④ Cross-browser — card rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1500);
  });

  // ── Geometric invariants ─────────────────────────

  test("no horizontal scrollbar at desktop viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test("no horizontal scrollbar at tablet viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test("no horizontal scrollbar at mobile viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  // ── Card body content is visible ─────────────────

  test("all card bodies visible at desktop", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    const visibleCards = await page.locator('[data-card-id] .card-body:not(.hidden)').count();
    // All 10 cards (9 + error) are expanded = at least 10 visible card bodies
    expect(visibleCards).toBeGreaterThanOrEqual(10);
  });

  test("card container width fits within viewport", async ({ page }) => {
    // The card container should not overflow its parent
    const container = page.locator(".container");
    const box = await container.boundingBox();
    if (box) {
      const viewport = page.viewportSize();
      expect(box.width).toBeLessThanOrEqual(viewport!.width);
    }
  });

  // ── Responsive layout ────────────────────────────

  test("card stack renders without overlapping at all viewports", async ({ page }) => {
    for (const [name, size] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);

      // Check that each card has non-zero width and doesn't overlap its neighbors
      const cards = page.locator(".card-container");
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(10);

      for (let i = 0; i < count; i++) {
        const box = await cards.nth(i).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        if (i > 0) {
          const prevBox = await cards.nth(i - 1).boundingBox();
          // Cards should be stacked vertically, not overlapping
          expect(box!.y).toBeGreaterThanOrEqual(prevBox!.y + prevBox!.height - 1);
        }
      }
    }
  });

  // ── Firefox specific ──────────────────────────────

  test("firefox renders cards without layout breakage", async ({ page }) => {
    // This test runs in the firefox-desktop project
    await page.setViewportSize(VIEWPORTS.desktop);
    const cardCount = await page.locator(".card-container").count();
    expect(cardCount).toBeGreaterThanOrEqual(10);

    // Verify no elements have negative width (firefox flexbox quirk check)
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

  test("firefox dark theme renders correctly", async ({ page }) => {
    // Check background color matches dark theme
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // Should be dark (#0a0a0a = rgb(10,10,10) or close)
    expect(bgColor).toMatch(/rgb\(\s*(?:1[0-2]|[0-9])\s*,\s*(?:1[0-2]|[0-9])\s*,\s*(?:1[0-2]|[0-9])\s*\)/);
  });
});
