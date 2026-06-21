/**
 * ⑥ L4 Cross-browser + responsive Playwright tests for 032 Sidebar components.
 *
 * Verifies sidebar fixture renders correctly across 4 viewports (1920/1280/768/500),
 * geometric invariants hold in real browser engines, and Firefox cross-browser parity.
 *
 * NFR-SIDE-01~10: sidebar width 280-600px, <768px overlay mode, toggle <150ms.
 * Existing JSDOM tests cover overlay breakpoint logic; these focus on real-browser
 * geometric invariants that JSDOM cannot verify.
 *
 * Run: npx playwright test tests/web/sidebar-responsive.pwtest.ts
 */

import { test, expect } from "@playwright/test";

const VIEWPORTS = {
  desktopWide: { width: 1920, height: 1080 },
  desktop: { width: 1280, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 500, height: 896 },
};

test.describe("⑥ L4 Sidebar — responsive geometry", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sidebar");
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
    test(`page body fits within viewport at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);

      const bodyBox = await page.locator("body").boundingBox();
      if (bodyBox) {
        const viewport = page.viewportSize();
        // Body width should not cause horizontal overflow
        expect(bodyBox.width).toBeLessThanOrEqual(viewport!.width + 1);
      }
    });
  }

  // ── All 8 fixture sections visible ───────────────────

  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`all fixture sections visible at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.waitForTimeout(400);

      const sections = page.locator(".fixture-section");
      const count = await sections.count();
      expect(count).toBeGreaterThanOrEqual(8);

      // First and last sections should be visible
      await expect(sections.first()).toBeVisible();
      await expect(sections.last()).toBeVisible();
    });
  }

  // ── Sidebar component rendered ───────────────────────

  test("sidebar aside element renders in dock mode at desktop", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    const sidebar = page.locator("aside[data-sidebar-mode]");
    const count = await sidebar.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const mode = await sidebar.first().getAttribute("data-sidebar-mode");
    expect(mode).toBe("dock");
  });

  test("sidebar has data-sidebar-width attribute", async ({ page }) => {
    const sidebar = page.locator("aside[data-sidebar-width]");
    const count = await sidebar.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const width = await sidebar.first().getAttribute("data-sidebar-width");
    expect(Number(width)).toBeGreaterThan(0);
  });

  // ── Session list items rendered ──────────────────────

  test("session list items render with correct count", async ({ page }) => {
    const items = page.locator('[data-session-id]');
    const count = await items.count();
    // mockSessions() produces 5 sessions
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("active session item has aria-selected", async ({ page }) => {
    const activeItem = page.locator('[data-session-id="sess-001"][aria-selected="true"]');
    await expect(activeItem).toBeVisible();
  });

  // ── Fixture grid layout does not break ───────────────

  test("fixture grid elements do not overlap at any viewport", async ({ page }) => {
    for (const [name, size] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);

      const sections = page.locator(".fixture-section");
      const count = await sections.count();

      for (let i = 0; i < count; i++) {
        const box = await sections.nth(i).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
        if (i > 0) {
          const prevBox = await sections.nth(i - 1).boundingBox();
          if (prevBox) {
            // Sections stacked vertically, not overlapping
            expect(box!.y).toBeGreaterThanOrEqual(prevBox.y + prevBox.height - 1);
          }
        }
      }
    }
  });

  // ── No broken layout elements ────────────────────────

  test("no elements have negative dimensions at any viewport", async ({ page }) => {
    for (const [name, size] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(size);
      await page.waitForTimeout(400);

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
      expect(brokenElements).toHaveLength(0);
    }
  });

  // ── Responsive grid switches at <768px ───────────────

  test("fixture grid is 1-column at mobile (500px)", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(500);

    // Check that fixture-grid matches 1fr at <767px (media query in fixture)
    // getComputedStyle resolves fr to px, so count column tracks instead
    const trackCount = await page.evaluate(() => {
      const grid = document.querySelector(".fixture-grid");
      if (!grid) return null;
      return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    });
    expect(trackCount).toBe(1);
  });

  test("fixture grid is 2-column at tablet (768px)", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(500);

    const trackCount = await page.evaluate(() => {
      const grid = document.querySelector(".fixture-grid");
      if (!grid) return null;
      return getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    });
    expect(trackCount).toBe(2);
  });

  // ── Section headers render ────────────────────────────

  test("all section headers are visible", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    const headers = page.locator(".fixture-section-header");
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(8);

    // Verify specific section headers exist
    await expect(page.locator(".fixture-section-header:has-text('SessionHistorySidebar')")).toBeVisible();
    await expect(page.locator(".fixture-section-header:has-text('SessionList')")).toBeVisible();
    await expect(page.locator(".fixture-section-header:has-text('PlaybackControls')")).toBeVisible();
    await expect(page.locator(".fixture-section-header:has-text('SessionDetailPanel')")).toBeVisible();
    await expect(page.locator(".fixture-section-header:has-text('Dialogs')")).toBeVisible();
  });

  // ── Visual regression screenshots ────────────────────

  test("full fixture page screenshot at desktop (1280px)", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("sidebar-responsive-desktop.png", { fullPage: true });
  });

  test("full fixture page screenshot at tablet (768px)", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("sidebar-responsive-tablet.png", { fullPage: true });
  });

  test("full fixture page screenshot at mobile (500px)", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot("sidebar-responsive-mobile.png", { fullPage: true });
  });

  // ── Firefox cross-browser ────────────────────────────

  test("firefox renders sidebar fixture without layout breakage", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    const sectionCount = await page.locator(".fixture-section").count();
    expect(sectionCount).toBeGreaterThanOrEqual(8);

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
    expect(brokenElements).toHaveLength(0);
  });

  test("firefox dark theme renders correctly on sidebar fixture", async ({ page }) => {
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    // Dark theme: #0a0a0a = rgb(10, 10, 10)
    expect(bgColor).toMatch(/rgb\(\s*(?:1[0-2]|[0-9])\s*,\s*(?:1[0-2]|[0-9])\s*,\s*(?:1[0-2]|[0-9])\s*\)/);
  });

  test("firefox sidebar component selectors are accessible", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);

    // Verify key sidebar selectors work in Firefox
    const aside = page.locator("aside[data-sidebar-mode]");
    await expect(aside.first()).toBeAttached();

    const sessionItems = page.locator("[data-session-id]");
    const count = await sessionItems.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
