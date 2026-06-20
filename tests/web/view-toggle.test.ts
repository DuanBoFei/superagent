import { describe, expect, it } from "vitest";
import { renderViewToggle } from "../../packages/web/src/components/chat/tool-grid/ViewToggle";
import type { ViewMode } from "../../packages/web/src/types/tool-grid";

// ── Basic Rendering ─────────────────────────────────

describe("basic rendering", () => {
  it("renders grid button", () => {
    const html = renderViewToggle("grid");
    expect(html).toContain("data-action=\"set-view-grid\"");
    expect(html).toContain("Grid");
  });

  it("renders list button", () => {
    const html = renderViewToggle("list");
    expect(html).toContain("data-action=\"set-view-list\"");
    expect(html).toContain("List");
  });

  it("renders both grid and list buttons", () => {
    const html = renderViewToggle("grid");
    expect(html).toContain("data-action=\"set-view-grid\"");
    expect(html).toContain("data-action=\"set-view-list\"");
  });
});

// ── Active State ────────────────────────────────────

describe("active state", () => {
  it("marks grid button as active when viewMode is grid", () => {
    const html = renderViewToggle("grid");
    expect(html).toContain("view-active-grid");
  });

  it("marks list button as active when viewMode is list", () => {
    const html = renderViewToggle("list");
    expect(html).toContain("view-active-list");
  });

  it("does not mark list as active when grid is selected", () => {
    const html = renderViewToggle("grid");
    expect(html).not.toContain("view-active-list");
  });

  it("does not mark grid as active when list is selected", () => {
    const html = renderViewToggle("list");
    expect(html).not.toContain("view-active-grid");
  });

  it("both buttons have view-toggle-btn CSS class", () => {
    const html = renderViewToggle("grid");
    const gridBtn = html.match(/view-toggle-btn[^"]*/g);
    expect(gridBtn).not.toBeNull();
    expect(gridBtn!.length).toBe(2);
  });
});

// ── Accessibility ───────────────────────────────────

describe("accessibility", () => {
  it("has view-toggle wrapper CSS class", () => {
    const html = renderViewToggle("grid");
    expect(html).toContain("view-toggle");
  });

  it("has role=group with aria-label", () => {
    const html = renderViewToggle("grid");
    expect(html).toContain('role="group"');
    expect(html).toContain("aria-label=");
  });

  it("grid button has aria-label", () => {
    const html = renderViewToggle("grid");
    expect(html).toContain('aria-label="Grid view"');
  });

  it("list button has aria-label", () => {
    const html = renderViewToggle("list");
    expect(html).toContain('aria-label="List view"');
  });

  it("active button has aria-pressed true", () => {
    const html = renderViewToggle("grid");
    expect(html).toContain("aria-pressed=\"true\"");
  });

  it("inactive button has aria-pressed false", () => {
    const html = renderViewToggle("grid");
    expect(html).toContain("aria-pressed=\"false\"");
  });
});

// ── All ViewModes ───────────────────────────────────

describe("all view modes", () => {
  it("renders without crashing for all view modes", () => {
    const modes: ViewMode[] = ["grid", "list"];
    for (const mode of modes) {
      const html = renderViewToggle(mode);
      expect(html).toBeTruthy();
      expect(typeof html).toBe("string");
      expect(html.length).toBeGreaterThan(0);
    }
  });
});
