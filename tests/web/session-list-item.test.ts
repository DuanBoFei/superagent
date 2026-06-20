import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  renderSessionListItem,
  createSessionListItemController,
} from "../../packages/web/src/components/sidebar/SessionListItem";
import type {
  SessionListItemController,
  SessionListItemOptions,
} from "../../packages/web/src/components/sidebar/SessionListItem";
import type { SessionSummary } from "../../packages/web/src/types/session-history";

let jsdom: JSDOM;

function createMockSession(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: "session-1",
    title: "Fix login bug",
    firstMessagePreview: "The login page returns 500 error when clicking submit button",
    createdAt: 1700000000000,
    updatedAt: 1700003600000,
    durationMs: 125000,
    toolCallCount: 5,
    messageCount: 12,
    status: "completed",
    tags: ["bugfix", "auth", "frontend"],
    forkedFrom: null,
    ...overrides,
  };
}

function setupDOM(): HTMLElement {
  jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
  });

  globalThis.document = jsdom.window.document as unknown as Document;
  globalThis.window = jsdom.window as unknown as Window & typeof globalThis;
  globalThis.MouseEvent = jsdom.window.MouseEvent as unknown as typeof MouseEvent;

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
}

// ── Render tests (pure string, no DOM needed) ──────────────

describe("renderSessionListItem", () => {
  it("renders a list item element", () => {
    const session = createMockSession();
    const html = renderSessionListItem({ session });
    expect(html).toContain("<li");
    expect(html).toContain("session-item");
  });

  it("renders session title", () => {
    const session = createMockSession({ title: "Fix login bug" });
    const html = renderSessionListItem({ session });
    expect(html).toContain("Fix login bug");
  });

  it("renders first message preview", () => {
    const session = createMockSession({
      firstMessagePreview: "The login page returns 500",
    });
    const html = renderSessionListItem({ session });
    expect(html).toContain("The login page returns 500");
  });

  it("renders preview with line-clamp class for 2-line truncation", () => {
    const session = createMockSession();
    const html = renderSessionListItem({ session });
    expect(html).toContain("line-clamp-2");
  });

  it("renders duration in MM:SS format", () => {
    const session = createMockSession({ durationMs: 125000 });
    const html = renderSessionListItem({ session });
    expect(html).toContain("02:05"); // 125s = 2m 5s
  });

  it("renders sub-second duration as 00:01", () => {
    const session = createMockSession({ durationMs: 500 });
    const html = renderSessionListItem({ session });
    expect(html).toContain("00:01");
  });

  it("renders zero duration as 00:00", () => {
    const session = createMockSession({ durationMs: 0 });
    const html = renderSessionListItem({ session });
    expect(html).toContain("00:00");
  });

  it("renders tool call count badge", () => {
    const session = createMockSession({ toolCallCount: 5 });
    const html = renderSessionListItem({ session });
    expect(html).toContain("5");
    expect(html).toContain("tool-count");
  });

  it("renders completed status with green indicator", () => {
    const session = createMockSession({ status: "completed" });
    const html = renderSessionListItem({ session });
    expect(html).toContain("status-completed");
    expect(html).toContain("emerald");
  });

  it("renders active status with blue indicator", () => {
    const session = createMockSession({ status: "active" });
    const html = renderSessionListItem({ session });
    expect(html).toContain("status-active");
  });

  it("renders error status with red indicator", () => {
    const session = createMockSession({ status: "error" });
    const html = renderSessionListItem({ session });
    expect(html).toContain("status-error");
  });

  it("renders tag chips up to 3, then +N overflow", () => {
    const session = createMockSession({
      tags: ["bugfix", "auth", "frontend", "typescript", "urgent"],
    });
    const html = renderSessionListItem({ session });

    // First 3 tags visible
    expect(html).toContain("bugfix");
    expect(html).toContain("auth");
    expect(html).toContain("frontend");

    // +N overflow
    expect(html).toContain("+2");

    // 4th and 5th tags NOT visible
    expect(html).not.toContain("typescript");
    expect(html).not.toContain("urgent");
  });

  it("renders all tags when 3 or fewer", () => {
    const session = createMockSession({ tags: ["bugfix", "auth"] });
    const html = renderSessionListItem({ session });
    expect(html).toContain("bugfix");
    expect(html).toContain("auth");
    expect(html).not.toContain("+");
  });

  it("renders no tags when empty", () => {
    const session = createMockSession({ tags: [] });
    const html = renderSessionListItem({ session });
    expect(html).not.toContain("session-tag");
  });

  it("renders fork indicator when forkedFrom is set", () => {
    const session = createMockSession({ forkedFrom: "parent-session-1" });
    const html = renderSessionListItem({ session });
    expect(html).toContain("fork-indicator");
  });

  it("does not render fork indicator when forkedFrom is null", () => {
    const session = createMockSession({ forkedFrom: null });
    const html = renderSessionListItem({ session });
    expect(html).not.toContain("fork-indicator");
  });

  it("applies active highlight class when isActive is true", () => {
    const session = createMockSession();
    const html = renderSessionListItem({ session, isActive: true });
    expect(html).toContain("session-item--active");
    expect(html).toContain("bg-zinc-900");
  });

  it("does not apply active class when isActive is false", () => {
    const session = createMockSession();
    const html = renderSessionListItem({ session, isActive: false });
    expect(html).not.toContain("session-item--active");
  });

  it("renders delete button", () => {
    const session = createMockSession();
    const html = renderSessionListItem({ session });
    expect(html).toContain('data-action="delete-session"');
    expect(html).toContain("opacity-0");
  });

  it("renders selection checkbox", () => {
    const session = createMockSession();
    const html = renderSessionListItem({ session });
    expect(html).toContain("checkbox");
    expect(html).toContain("multi-select");
  });

  it("renders checked checkbox when isSelected is true", () => {
    const session = createMockSession();
    const html = renderSessionListItem({ session, isSelected: true });
    expect(html).toContain("checked");
  });

  it("escapes HTML in title", () => {
    const session = createMockSession({ title: '<script>alert("xss")</script>' });
    const html = renderSessionListItem({ session });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in preview text", () => {
    const session = createMockSession({
      firstMessagePreview: '<img src=x onerror="alert(1)">',
    });
    const html = renderSessionListItem({ session });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("sets data-session-id attribute", () => {
    const session = createMockSession({ id: "abc-123" });
    const html = renderSessionListItem({ session });
    expect(html).toContain('data-session-id="abc-123"');
  });

  it("sets aria-label with session title", () => {
    const session = createMockSession({ title: "Fix login bug" });
    const html = renderSessionListItem({ session });
    expect(html).toContain('aria-label="Session: Fix login bug"');
  });
});

// ── Controller tests (need DOM) ──────────────────────────

describe("SessionListItemController", () => {
  let container: HTMLElement;
  let controller: SessionListItemController;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: SessionListItemOptions): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderSessionListItem(options);
    const el = container.querySelector<HTMLElement>(".session-item")!;
    controller = createSessionListItemController(el, options);
    controller.attach();
    return el;
  }

  it("calls onSelect when item is clicked", () => {
    const session = createMockSession();
    const onSelect = vi.fn();
    renderAndAttach({ session, onSelect });

    const item = container.querySelector<HTMLElement>(".session-item")!;
    item.click();

    expect(onSelect).toHaveBeenCalledWith("session-1");
  });

  it("calls onDelete when delete button is clicked", () => {
    const session = createMockSession();
    const onDelete = vi.fn();
    renderAndAttach({ session, onDelete });

    const deleteBtn = container.querySelector<HTMLElement>(
      '[data-action="delete-session"]',
    )!;
    deleteBtn.click();

    expect(onDelete).toHaveBeenCalledWith("session-1");
  });

  it("stops click propagation on delete button", () => {
    const session = createMockSession();
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    renderAndAttach({ session, onSelect, onDelete });

    const deleteBtn = container.querySelector<HTMLElement>(
      '[data-action="delete-session"]',
    )!;
    deleteBtn.click();

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("calls onToggleSelect when checkbox is clicked", () => {
    const session = createMockSession();
    const onToggleSelect = vi.fn();
    renderAndAttach({ session, onToggleSelect });

    const checkbox = container.querySelector<HTMLElement>(
      '[data-action="toggle-select"]',
    )!;
    checkbox.click();

    expect(onToggleSelect).toHaveBeenCalledWith("session-1");
  });

  it("stops click propagation on checkbox", () => {
    const session = createMockSession();
    const onSelect = vi.fn();
    const onToggleSelect = vi.fn();
    renderAndAttach({ session, onSelect, onToggleSelect });

    const checkbox = container.querySelector<HTMLElement>(
      '[data-action="toggle-select"]',
    )!;
    checkbox.click();

    expect(onToggleSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("detach removes click listener", () => {
    const session = createMockSession();
    const onSelect = vi.fn();
    renderAndAttach({ session, onSelect });

    controller.detach();

    const item = container.querySelector<HTMLElement>(".session-item")!;
    item.click();

    expect(onSelect).not.toHaveBeenCalled();
  });
});
