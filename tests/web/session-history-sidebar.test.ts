import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  renderSessionHistorySidebar,
  createSessionHistorySidebarController,
} from "../../packages/web/src/components/sidebar/SessionHistorySidebar";
import type {
  SidebarController,
  SidebarControllerOptions,
} from "../../packages/web/src/components/sidebar/SessionHistorySidebar";
import type { SessionHistorySlice } from "../../packages/web/src/store/slices/session-history.slice";

let jsdom: JSDOM;

function createMockSlice(
  overrides: Partial<{
    sidebarOpen: boolean;
    sidebarWidth: number;
    sidebarMode: "dock" | "overlay";
  }> = {},
): SessionHistorySlice {
  let open = overrides.sidebarOpen ?? true;
  let width = overrides.sidebarWidth ?? 360;
  let mode = overrides.sidebarMode ?? "dock";

  return {
    getSessions: () => [],
    getFilters: () => ({ text: "", dateRange: null, statusFilter: null, tagsFilter: null }),
    getActiveSessionId: () => null,
    getSidebarOpen: () => open,
    getSidebarWidth: () => width,
    getSidebarMode: () => mode,
    setFilters: () => {},
    resetFilters: () => {},
    toggleSidebar: () => { open = !open; },
    setSidebarWidth: (w: number) => { width = Math.max(280, Math.min(600, w)); },
    setSidebarMode: (m: "dock" | "overlay") => { mode = m; },
    selectSession: () => {},
    deselectSession: () => {},
    refreshSessions: async () => {},
    updateTags: async () => {},
    updateTitle: async () => {},
  };
}

function setupDOM(): { mainEl: HTMLElement; container: HTMLElement } {
  jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
    pretendToBeVisual: true,
  });

  // Shim globals so source code's document/window references work
  globalThis.document = jsdom.window.document as unknown as Document;
  globalThis.window = jsdom.window as unknown as Window & typeof globalThis;
  globalThis.KeyboardEvent = jsdom.window.KeyboardEvent as unknown as typeof KeyboardEvent;
  globalThis.MouseEvent = jsdom.window.MouseEvent as unknown as typeof MouseEvent;

  // Stub matchMedia (not implemented in jsdom)
  jsdom.window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: "",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  } as MediaQueryList);

  const container = document.createElement("div");
  container.id = "app";
  const mainEl = document.createElement("main");
  mainEl.className = "chat-page";
  container.appendChild(mainEl);
  document.body.appendChild(container);
  return { mainEl, container };
}

function cleanupDOM(): void {
  if (!jsdom) return;
  document.body.innerHTML = "";
  jsdom.window.close();
  jsdom = undefined!;
  // Restore globals
  delete (globalThis as Record<string, unknown>).document;
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).KeyboardEvent;
  delete (globalThis as Record<string, unknown>).MouseEvent;
}

describe("renderSessionHistorySidebar", () => {
  let slice: SessionHistorySlice;

  beforeEach(() => {
    slice = createMockSlice();
  });

  it("renders sidebar element with correct tag", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain("<aside");
    expect(html).toContain("session-sidebar");
  });

  it("renders with translate-x-0 when open", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain("translate-x-0");
    expect(html).not.toContain("-translate-x-full");
  });

  it("renders with -translate-x-full when closed", () => {
    slice.toggleSidebar();
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain("-translate-x-full");
    expect(html).not.toContain("translate-x-0");
  });

  it("renders correct width inline style", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain("width:360px");
  });

  it("renders updated width after state change", () => {
    slice.setSidebarWidth(400);
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain("width:400px");
  });

  it("sets data-sidebar-open attribute", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain('data-sidebar-open="1"');
  });

  it("sets data-sidebar-mode attribute for dock mode", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain('data-sidebar-mode="dock"');
  });

  it("renders drag handle element", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain("sidebar-drag-handle");
    expect(html).toContain("cursor-col-resize");
  });

  it("renders close button", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain("sidebar-close-btn");
    expect(html).toContain("Close sidebar");
  });

  it("renders SuperAgent header text", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain("SuperAgent");
  });

  it("renders sidebar body container", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain("sidebar-body");
  });

  it("renders role complementary for accessibility", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain('role="complementary"');
  });

  it("renders aria-label", () => {
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain('aria-label="Session history"');
  });

  it("escapes special characters in attributes", () => {
    slice.setSidebarMode("overlay");
    const html = renderSessionHistorySidebar({ slice });
    expect(html).toContain("data-sidebar-mode=");
    expect(html).toContain("overlay");
    // verify no raw angle brackets in content
    expect(html).not.toContain("<<");
  });
});

describe("SessionHistorySidebarController", () => {
  let slice: SessionHistorySlice;
  let mainEl: HTMLElement;
  let controller: SidebarController;

  beforeEach(() => {
    slice = createMockSlice();
    const domSetup = setupDOM();
    mainEl = domSetup.mainEl;
    mainEl.innerHTML = renderSessionHistorySidebar({ slice });
    const ctrlOpts: SidebarControllerOptions = { slice, mainContentEl: mainEl };
    controller = createSessionHistorySidebarController(ctrlOpts);
    controller.attach();
  });

  afterEach(() => {
    controller.detach();
    cleanupDOM();
  });

  it("close button click toggles sidebar state", () => {
    expect(slice.getSidebarOpen()).toBe(true);

    const closeBtn = document.querySelector<HTMLElement>('[data-action="close-sidebar"]');
    closeBtn?.click();

    expect(slice.getSidebarOpen()).toBe(false);
  });

  it("close button hides sidebar visually", () => {
    const closeBtn = document.querySelector<HTMLElement>('[data-action="close-sidebar"]');
    closeBtn?.click();

    const sidebarEl = document.querySelector<HTMLElement>(".session-sidebar");
    expect(sidebarEl?.classList.contains("-translate-x-full")).toBe(true);
    expect(sidebarEl?.getAttribute("data-sidebar-open")).toBe("0");
  });

  it("ESC key closes open sidebar", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(slice.getSidebarOpen()).toBe(false);
  });

  it("ESC key does not affect already closed sidebar", () => {
    slice.toggleSidebar(); // close
    const sidebarEl = document.querySelector<HTMLElement>(".session-sidebar")!;
    sidebarEl.classList.remove("-translate-x-full");
    sidebarEl.classList.add("translate-x-0");

    // Re-render with closed state
    sidebarEl.outerHTML = renderSessionHistorySidebar({ slice });
    controller.detach();
    controller.attach();

    expect(slice.getSidebarOpen()).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(slice.getSidebarOpen()).toBe(false);
  });

  it("drag handle starts drag on mousedown", () => {
    const handle = document.querySelector<HTMLElement>('[data-action="drag-handle"]');
    expect(handle).not.toBeNull();

    const initialWidth = slice.getSidebarWidth();

    handle?.dispatchEvent(new MouseEvent("mousedown", { clientX: 400, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 450, bubbles: true }));

    // Width should have increased by 50px
    expect(slice.getSidebarWidth()).toBeGreaterThan(initialWidth);
  });

  it("drag respects minimum width clamp", () => {
    const handle = document.querySelector<HTMLElement>('[data-action="drag-handle"]');

    handle?.dispatchEvent(new MouseEvent("mousedown", { clientX: 400, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(slice.getSidebarWidth()).toBeGreaterThanOrEqual(280);
  });

  it("drag respects maximum width clamp", () => {
    const handle = document.querySelector<HTMLElement>('[data-action="drag-handle"]');

    handle?.dispatchEvent(new MouseEvent("mousedown", { clientX: 400, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 2000, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(slice.getSidebarWidth()).toBeLessThanOrEqual(600);
  });

  it("mouseup stops dragging", () => {
    const handle = document.querySelector<HTMLElement>('[data-action="drag-handle"]');

    handle?.dispatchEvent(new MouseEvent("mousedown", { clientX: 400, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    const widthAfterUp = slice.getSidebarWidth();
    // Further moves should not affect width
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 800, bubbles: true }));
    expect(slice.getSidebarWidth()).toBe(widthAfterUp);
  });

  it("updateWidth changes sidebar element style", () => {
    controller.updateWidth(450);
    const sidebarEl = document.querySelector<HTMLElement>(".session-sidebar");
    expect(sidebarEl?.style.width).toBe("450px");
    expect(sidebarEl?.getAttribute("data-sidebar-width")).toBe("450");
  });

  it("detach removes event listeners", () => {
    controller.detach();

    // ESC should no longer trigger close
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(slice.getSidebarOpen()).toBe(true);
  });

  it("supports overlay mode rendering", () => {
    const overlaySlice = createMockSlice({ sidebarMode: "overlay" });
    mainEl.innerHTML = renderSessionHistorySidebar({ slice: overlaySlice });

    const sidebarEl = document.querySelector<HTMLElement>(".session-sidebar");
    expect(sidebarEl?.getAttribute("data-sidebar-mode")).toBe("overlay");
  });
});
