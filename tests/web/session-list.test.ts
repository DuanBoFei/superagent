import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  renderSessionList,
  createSessionListController,
} from "../../packages/web/src/components/sidebar/SessionList";
import type {
  SessionListController,
  SessionListOptions,
} from "../../packages/web/src/components/sidebar/SessionList";
import type { SessionSummary } from "../../packages/web/src/types/session-history";

let jsdom: JSDOM;

function createMockSession(
  id: string,
  overrides: Partial<SessionSummary> = {},
): SessionSummary {
  return {
    id,
    title: `Session ${id}`,
    firstMessagePreview: `Preview for session ${id}`,
    createdAt: 1700000000000 + Number(id) * 10000,
    updatedAt: 1700003600000 + Number(id) * 10000,
    durationMs: 60000 + Number(id) * 1000,
    toolCallCount: 3,
    messageCount: 8,
    status: "completed",
    tags: [],
    forkedFrom: null,
    ...overrides,
  };
}

function createMockSessions(count: number): SessionSummary[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSession(String(i + 1)),
  );
}

function setupDOM(): HTMLElement {
  jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
  });

  globalThis.document = jsdom.window.document as unknown as Document;
  globalThis.window = jsdom.window as unknown as Window & typeof globalThis;
  globalThis.MouseEvent = jsdom.window.MouseEvent as unknown as typeof MouseEvent;
  globalThis.KeyboardEvent = jsdom.window.KeyboardEvent as unknown as typeof KeyboardEvent;

  const container = document.createElement("div");
  container.id = "test-container";
  document.body.appendChild(container);
  return container;
}

function cleanupDOM(): void {
  if (!jsdom) return;
  document.body.innerHTML = "";
  jsdom.window.close();
  jsdom = undefined!;
  delete (globalThis as Record<string, unknown>).document;
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).MouseEvent;
  delete (globalThis as Record<string, unknown>).KeyboardEvent;
}

// ── Render tests ──────────────────────────────────────

describe("renderSessionList", () => {
  it("renders a list container element", () => {
    const sessions = createMockSessions(3);
    const html = renderSessionList({ sessions });
    expect(html).toContain("session-list");
    expect(html).toContain('role="listbox"');
  });

  it("renders empty state when sessions array is empty", () => {
    const html = renderSessionList({ sessions: [] });
    expect(html).toContain("session-list--empty");
    expect(html).toContain("No sessions yet");
  });

  it("renders empty state hint text", () => {
    const html = renderSessionList({ sessions: [] });
    expect(html).toContain("Start a conversation to see it here");
  });

  it("renders loading skeleton when isLoading is true", () => {
    const html = renderSessionList({ sessions: [], isLoading: true });
    expect(html).toContain("session-list--loading");
    expect(html).toContain("skeleton");
  });

  it("renders loading skeleton with placeholder items", () => {
    const html = renderSessionList({ sessions: [], isLoading: true });
    // Should have multiple skeleton placeholder items
    const skeletonCount = (html.match(/skeleton-item/g) || []).length;
    expect(skeletonCount).toBeGreaterThanOrEqual(3);
  });

  it("does not render skeleton when sessions exist even if loading", () => {
    const sessions = createMockSessions(5);
    const html = renderSessionList({ sessions, isLoading: true });
    expect(html).not.toContain("session-list--empty");
    // With existing sessions, they should still render (loading overlay separate)
    expect(html).toContain("session-item");
  });

  it("renders session list items for each session", () => {
    const sessions = createMockSessions(3);
    const html = renderSessionList({ sessions });
    expect(html).toContain("Session 1");
    expect(html).toContain("Session 2");
    expect(html).toContain("Session 3");
  });

  it("renders in virtual scroll mode when sessions > threshold (20)", () => {
    const sessions = createMockSessions(25);
    const html = renderSessionList({ sessions });
    expect(html).toContain("session-list--virtual");
    expect(html).toContain("data-virtual-scroll");
  });

  it("renders in normal mode when sessions <= threshold", () => {
    const sessions = createMockSessions(15);
    const html = renderSessionList({ sessions });
    expect(html).not.toContain("session-list--virtual");
  });

  it("renders virtual scroll spacer with estimated height", () => {
    const sessions = createMockSessions(30);
    const html = renderSessionList({ sessions });
    expect(html).toContain("session-list-spacer");
    // Spacer height should be sessions * estimatedItemHeight
    expect(html).toContain("height:");
  });

  it("highlights active session in the list", () => {
    const sessions = createMockSessions(5);
    const html = renderSessionList({ sessions, activeSessionId: "3" });
    expect(html).toContain('data-session-id="3"');
    expect(html).toContain("session-item--active");
  });

  it("renders all checkboxes as checked when in select-all state", () => {
    const sessions = createMockSessions(3);
    const selectedIds = new Set(["1", "2", "3"]);
    const html = renderSessionList({ sessions, selectedIds });
    // All three items should have checked checkboxes
    const checkedCount = (html.match(/checked/g) || []).length;
    expect(checkedCount).toBeGreaterThanOrEqual(3);
  });

  it("sets aria-multiselectable on the listbox", () => {
    const sessions = createMockSessions(3);
    const html = renderSessionList({ sessions });
    expect(html).toContain('aria-multiselectable="true"');
  });

  it("sets aria-label on the list", () => {
    const sessions = createMockSessions(3);
    const html = renderSessionList({ sessions });
    expect(html).toContain('aria-label="Session list"');
  });

  it("sets data-session-count attribute", () => {
    const sessions = createMockSessions(12);
    const html = renderSessionList({ sessions });
    expect(html).toContain('data-session-count="12"');
  });
});

// ── Controller tests ─────────────────────────────────

describe("SessionListController", () => {
  let container: HTMLElement;
  let controller: SessionListController;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: SessionListOptions): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderSessionList(options);
    const el = container.querySelector<HTMLElement>(".session-list")!;
    controller = createSessionListController(el, options);
    controller.attach();
    return el;
  }

  it("calls onSelect when a session item is clicked", () => {
    const sessions = createMockSessions(5);
    const onSelect = vi.fn();
    renderAndAttach({ sessions, onSelect });

    const item = container.querySelector<HTMLElement>(
      '[data-session-id="3"]',
    )!;
    item.click();

    expect(onSelect).toHaveBeenCalledWith("3", {
      shift: false,
      ctrl: false,
    });
  });

  it("passes ctrl modifier in onSelect when Ctrl+click", () => {
    const sessions = createMockSessions(5);
    const onSelect = vi.fn();
    renderAndAttach({ sessions, onSelect });

    const item = container.querySelector<HTMLElement>(
      '[data-session-id="2"]',
    )!;
    item.dispatchEvent(
      new MouseEvent("click", { ctrlKey: true, bubbles: true }),
    );

    expect(onSelect).toHaveBeenCalledWith("2", {
      shift: false,
      ctrl: true,
    });
  });

  it("passes shift modifier in onSelect when Shift+click", () => {
    const sessions = createMockSessions(5);
    const onSelect = vi.fn();
    renderAndAttach({ sessions, onSelect });

    const item = container.querySelector<HTMLElement>(
      '[data-session-id="4"]',
    )!;
    item.dispatchEvent(
      new MouseEvent("click", { shiftKey: true, bubbles: true }),
    );

    expect(onSelect).toHaveBeenCalledWith("4", {
      shift: true,
      ctrl: false,
    });
  });

  it("calls onDelete when delete action is triggered on an item", () => {
    const sessions = createMockSessions(5);
    const onDelete = vi.fn();
    renderAndAttach({ sessions, onDelete });

    const deleteBtn = container.querySelector<HTMLElement>(
      '[data-session-id="1"] [data-action="delete-session"]',
    )!;
    deleteBtn.click();

    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("calls onToggleSelect when checkbox is toggled", () => {
    const sessions = createMockSessions(5);
    const onToggleSelect = vi.fn();
    renderAndAttach({ sessions, onToggleSelect });

    const checkbox = container.querySelector<HTMLElement>(
      '[data-session-id="3"] [data-action="toggle-select"]',
    )!;
    checkbox.click();

    expect(onToggleSelect).toHaveBeenCalledWith("3");
  });

  it("detach removes event listeners", () => {
    const sessions = createMockSessions(5);
    const onSelect = vi.fn();
    renderAndAttach({ sessions, onSelect });

    controller.detach();

    const item = container.querySelector<HTMLElement>(
      '[data-session-id="1"]',
    )!;
    item.click();

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("scrollToSession scrolls the target item into view", () => {
    const sessions = createMockSessions(5);
    renderAndAttach({ sessions });

    const target = container.querySelector<HTMLElement>(
      '[data-session-id="3"]',
    )!;
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    controller.scrollToSession("3");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("scrollToTop scrolls the container to the top", () => {
    const sessions = createMockSessions(5);
    renderAndAttach({ sessions });

    const scrollEl = container.querySelector<HTMLElement>(".session-list-inner")!;
    scrollEl.scrollTop = 500;

    controller.scrollToTop();
    expect(scrollEl.scrollTop).toBe(0);
  });
});

// ── Multi-select keyboard tests ───────────────────────

describe("SessionList multi-select keyboard", () => {
  let container: HTMLElement;
  let controller: SessionListController;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: SessionListOptions): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderSessionList(options);
    const el = container.querySelector<HTMLElement>(".session-list")!;
    controller = createSessionListController(el, options);
    controller.attach();
    return el;
  }

  it("Ctrl+A triggers select-all via onToggleSelect for each session", () => {
    const sessions = createMockSessions(5);
    const onToggleSelect = vi.fn();
    renderAndAttach({ sessions, onToggleSelect });

    const listEl = container.querySelector<HTMLElement>(".session-list")!;
    listEl.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true }),
    );

    // Should call onToggleSelect for each session
    expect(onToggleSelect).toHaveBeenCalledTimes(5);
  });
});
