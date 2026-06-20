/**
 * ③ a11y audit — axe-core scan on ToolGrid fixture (complements T019 structural tests).
 *
 * Uses JSDOM + axe-core to validate WCAG compliance of ToolGrid HTML components.
 * T019 already added ARIA roles/attributes; this scan confirms correctness in context.
 *
 * Run: npx vitest run tests/web/tool-grid-a11y-audit.test.ts
 */

import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import axe from "axe-core";
import { generateToolGridFixtureHtml } from "./tool-grid-fixtures";

async function runAxeAudit(html: string): Promise<axe.AxeResults> {
  const dom = new JSDOM(html, {
    url: "http://localhost",
    runScripts: "dangerously",
  });

  const doc = dom.window.document;

  return await axe.run(doc.documentElement);
}

describe("③ a11y audit — axe-core on ToolGrid fixture", () => {
  const TIMEOUT = 15000;

  it("ToolGrid fixture passes axe-core with no serious/critical violations", { timeout: TIMEOUT }, async () => {
    const html = generateToolGridFixtureHtml();
    const results = await runAxeAudit(html);

    const severeViolations = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (severeViolations.length > 0) {
      console.error(
        `[a11y-toolgrid] ${severeViolations.length} severe violations:\n` +
          severeViolations
            .map(
              (v) =>
                `  - ${v.id}: ${v.help} (${v.impact})\n    Nodes: ${v.nodes.length}\n    ${v.helpUrl}`,
            )
            .join("\n"),
      );
    }

    if (results.violations.length > 0) {
      const report = {
        passes: results.passes.length,
        violations: results.violations.length,
        incomplete: results.incomplete.length,
        violationList: results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.map((n) => n.html.slice(0, 120)),
        })),
      };
      console.log("[a11y-toolgrid] Audit report:", JSON.stringify(report, null, 2));
    }

    // T019 added ARIA roles/attributes to all 7 components — expect zero severe violations
    expect(severeViolations).toHaveLength(0);
  });

  it("ToolCard articles have accessible names", { timeout: TIMEOUT }, async () => {
    const html = generateToolGridFixtureHtml();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const articles = doc.querySelectorAll('[role="article"]');
    expect(articles.length).toBeGreaterThanOrEqual(10);

    for (const article of articles) {
      const ariaLabel = article.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
    }
  });

  it("ToolProgressBar elements have correct progressbar role and values", { timeout: TIMEOUT }, async () => {
    const html = generateToolGridFixtureHtml();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const progressBars = doc.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThanOrEqual(1);

    for (const bar of progressBars) {
      expect(bar.hasAttribute("aria-valuenow")).toBe(true);
      expect(bar.hasAttribute("aria-valuemin")).toBe(true);
      expect(bar.hasAttribute("aria-valuemax")).toBe(true);
      expect(bar.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("ErrorAggregationPanel uses role=alert with aria-live=polite", { timeout: TIMEOUT }, async () => {
    const html = generateToolGridFixtureHtml();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const alertRegions = doc.querySelectorAll('[role="alert"]');
    expect(alertRegions.length).toBeGreaterThanOrEqual(1);

    // Each alert should also have aria-live
    for (const region of alertRegions) {
      expect(region.getAttribute("aria-live")).toBe("polite");
    }
  });

  it("BulkActionBar has role=toolbar with aria-controls link", { timeout: TIMEOUT }, async () => {
    const html = generateToolGridFixtureHtml();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const toolbars = doc.querySelectorAll('[role="toolbar"]');
    expect(toolbars.length).toBeGreaterThanOrEqual(1);

    for (const toolbar of toolbars) {
      expect(toolbar.getAttribute("aria-label")).toBeTruthy();
    }

    // Verify aria-controls="tool-grid-region" links to an element that exists
    const controlledIds = new Set<string>();
    for (const toolbar of toolbars) {
      const controls = toolbar.getAttribute("aria-controls");
      if (controls) controlledIds.add(controls);
    }

    for (const id of controlledIds) {
      const target = doc.getElementById(id);
      expect(target).not.toBeNull();
    }
  });

  it("ViewToggle buttons have aria-pressed reflecting active state", { timeout: TIMEOUT }, async () => {
    const html = generateToolGridFixtureHtml();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const groups = doc.querySelectorAll('[role="group"]');
    const viewGroups = Array.from(groups).filter(
      (g) => g.getAttribute("aria-label") === "View mode",
    );
    expect(viewGroups.length).toBeGreaterThanOrEqual(1);

    for (const group of viewGroups) {
      const pressedButtons = group.querySelectorAll('[aria-pressed="true"]');
      expect(pressedButtons.length).toBe(1);
    }
  });

  it("ResourceBarChart has figure role with tablist for metrics", { timeout: TIMEOUT }, async () => {
    const html = generateToolGridFixtureHtml();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const figures = doc.querySelectorAll('[role="figure"]');
    expect(figures.length).toBeGreaterThanOrEqual(1);

    for (const figure of figures) {
      const tablist = figure.querySelector('[role="tablist"]');
      expect(tablist).not.toBeNull();

      const tabs = figure.querySelectorAll('[role="tab"]');
      expect(tabs.length).toBe(2);

      // One tab should be selected, one not
      const selected = figure.querySelectorAll('[aria-selected="true"]');
      expect(selected.length).toBe(1);
    }
  });

  it("ToolGrid region has id for aria-controls linking", { timeout: TIMEOUT }, async () => {
    const html = generateToolGridFixtureHtml();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const regions = doc.querySelectorAll('[role="region"]');
    expect(regions.length).toBeGreaterThanOrEqual(1);

    for (const region of regions) {
      expect(region.id).toBe("tool-grid-region");
      expect(region.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("all interactive elements have accessible names via text or aria-label", { timeout: TIMEOUT }, async () => {
    const html = generateToolGridFixtureHtml();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const interactiveElements = doc.querySelectorAll("button, [data-action], [tabindex]");
    const unnamed: string[] = [];

    for (const el of interactiveElements) {
      const text = el.textContent?.trim();
      const ariaLabel = el.getAttribute("aria-label");
      const title = el.getAttribute("title");
      if (!text && !ariaLabel && !title) {
        unnamed.push(
          `<${el.tagName.toLowerCase()}${el.getAttribute("data-action") ? ` data-action="${el.getAttribute("data-action")}"` : ""}>`,
        );
      }
    }

    if (unnamed.length > 0) {
      console.warn(`[a11y-toolgrid] ${unnamed.length} interactive elements lack accessible names:\n  ${unnamed.join("\n  ")}`);
    }

    // T019 added aria-labels to all ToolGrid buttons — expect zero unnamed
    expect(unnamed).toHaveLength(0);
  });

  it("empty ErrorAggregationPanel returns nothing (no erroneous DOM)", { timeout: TIMEOUT }, async () => {
    const html = generateToolGridFixtureHtml();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // The empty error panel section should have an empty marker and no error DOM
    const marker = doc.getElementById("error-empty-marker");
    expect(marker).not.toBeNull();

    // No error panel HTML should follow the empty marker
    const errorPanels = doc.querySelectorAll('[role="alert"]');
    // The "collapsed" and "single" error panels also render alerts,
    // so there will be some alerts from other sections. We just verify
    // the empty marker section has no alert adjacent to it.
    const hasAdjacentAlert = marker.nextElementSibling?.getAttribute("role") === "alert";
    expect(hasAdjacentAlert).toBe(false);
  });
});
