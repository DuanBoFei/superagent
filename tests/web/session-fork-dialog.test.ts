import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  buildForkTitle,
  forkSession,
  renderForkDialog,
  createForkDialogController,
} from "../../packages/web/src/components/sidebar/SessionForkDialog";
import type {
  ForkDialogOptions,
  ForkDialogController,
} from "../../packages/web/src/components/sidebar/SessionForkDialog";
import type { Session } from "../../packages/web/src/types/session-history";

let jsdom: JSDOM;

function setupDOM(): HTMLElement {
  jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
  });

  globalThis.document = jsdom.window.document as unknown as Document;
  globalThis.window = jsdom.window as unknown as Window & typeof globalThis;
  globalThis.Event = jsdom.window.Event as unknown as typeof Event;
  globalThis.MouseEvent = jsdom.window.MouseEvent as unknown as typeof MouseEvent;
  globalThis.KeyboardEvent = jsdom.window.KeyboardEvent as unknown as typeof KeyboardEvent;

  const container = document.createElement("div");
  container.id = "test-container";
  document.body.appendChild(container);
  return container;
}

function cleanupDOM(): void {
  if (!jsdom) return;
  jsdom.window.close();
  jsdom = undefined!;
  delete (globalThis as Record<string, unknown>).document;
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).Event;
  delete (globalThis as Record<string, unknown>).MouseEvent;
  delete (globalThis as Record<string, unknown>).KeyboardEvent;
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess-001",
    title: "Fix login bug",
    createdAt: 1700000000000,
    updatedAt: 1700000100000,
    durationMs: 5000,
    toolCallCount: 2,
    messageCount: 5,
    status: "completed",
    tags: ["bugfix"],
    forkedFrom: null,
    forkedAtMessageIndex: null,
    messages: [
      { role: "user", content: "Hello" } as Session["messages"][0],
      { role: "assistant", content: "Hi there" } as Session["messages"][0],
      { role: "user", content: "Fix the bug" } as Session["messages"][0],
      { role: "assistant", content: "Looking..." } as Session["messages"][0],
      { role: "assistant", content: "Done" } as Session["messages"][0],
    ],
    toolCalls: [
      { id: "tc1", tool: "Read", status: "completed" } as Session["toolCalls"][0],
      { id: "tc2", tool: "Edit", status: "completed" } as Session["toolCalls"][0],
    ],
    ...overrides,
  };
}

// ── Pure function tests ─────────────────────────────────

describe("buildForkTitle", () => {
  it('returns Fork of "original title" format', () => {
    expect(buildForkTitle("Fix login bug")).toBe('Fork of "Fix login bug"');
  });

  it("handles empty source title", () => {
    expect(buildForkTitle("")).toBe('Fork of ""');
  });

  it("handles title with special characters", () => {
    expect(buildForkTitle('Debug "null" error')).toBe(
      'Fork of "Debug "null" error"',
    );
  });
});

describe("forkSession", () => {
  it("creates new session with new UUID", () => {
    const source = makeSession();
    const result = forkSession(source, 2);

    expect(result.id).not.toBe(source.id);
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("copies messages up to and including messageIndex", () => {
    const source = makeSession();
    const result = forkSession(source, 2);

    expect(result.messages).toHaveLength(3);
    expect(result.messages[0]).toEqual(source.messages[0]);
    expect(result.messages[1]).toEqual(source.messages[1]);
    expect(result.messages[2]).toEqual(source.messages[2]);
  });

  it("copies toolCalls up to messageIndex", () => {
    const source = makeSession();
    const result = forkSession(source, 4);

    // toolCalls associated with messages up to index 4
    expect(result.toolCalls.length).toBeLessThanOrEqual(source.toolCalls.length);
  });

  it("sets forkedFrom to source session ID", () => {
    const source = makeSession();
    const result = forkSession(source, 1);

    expect(result.forkedFrom).toBe(source.id);
  });

  it("sets forkedAtMessageIndex to the fork point", () => {
    const source = makeSession();
    const result = forkSession(source, 3);

    expect(result.forkedAtMessageIndex).toBe(3);
  });

  it("sets default title to Fork of [original]", () => {
    const source = makeSession({ title: "Debug auth" });
    const result = forkSession(source, 0);

    expect(result.title).toBe('Fork of "Debug auth"');
  });

  it("uses custom title when provided", () => {
    const source = makeSession();
    const result = forkSession(source, 0, "My fork");

    expect(result.title).toBe("My fork");
  });

  it("sets status to active for new session", () => {
    const source = makeSession({ status: "completed" });
    const result = forkSession(source, 2);

    expect(result.status).toBe("active");
  });

  it("sets updatedAt to current timestamp", () => {
    const source = makeSession({ updatedAt: 100 });
    const before = Date.now();
    const result = forkSession(source, 0);

    expect(result.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("preserves createdAt from source", () => {
    const source = makeSession({ createdAt: 1700000000000 });
    const result = forkSession(source, 0);

    expect(result.createdAt).toBe(1700000000000);
  });

  it("sets messageCount to copied message count", () => {
    const source = makeSession();
    const result = forkSession(source, 2);

    expect(result.messageCount).toBe(3);
  });

  it("copies tags from source", () => {
    const source = makeSession({ tags: ["bugfix", "urgent"] });
    const result = forkSession(source, 1);

    expect(result.tags).toEqual(["bugfix", "urgent"]);
  });

  it("copies all messages when index is last message", () => {
    const source = makeSession();
    const result = forkSession(source, 4);

    expect(result.messages).toHaveLength(5);
  });

  it("copies single message when index is 0", () => {
    const source = makeSession();
    const result = forkSession(source, 0);

    expect(result.messages).toHaveLength(1);
  });
});

// ── Render tests ────────────────────────────────────────

describe("renderForkDialog", () => {
  it("renders fork dialog with source title", () => {
    const html = renderForkDialog({
      sourceTitle: "Fix login bug",
      messageIndex: 3,
      totalMessages: 10,
    });
    expect(html).toContain("session-fork-dialog");
    expect(html).toContain("Fork of &quot;Fix login bug&quot;");
  });

  it("shows message index and total count", () => {
    const html = renderForkDialog({
      sourceTitle: "Test",
      messageIndex: 5,
      totalMessages: 42,
    });
    expect(html).toContain("5");
    expect(html).toContain("42");
  });

  it("renders title input with default fork title", () => {
    const html = renderForkDialog({
      sourceTitle: "Debug auth",
      messageIndex: 0,
      totalMessages: 5,
    });
    expect(html).toContain('type="text"');
    expect(html).toContain("Fork of &quot;Debug auth&quot;");
  });

  it("renders confirm and cancel buttons", () => {
    const html = renderForkDialog({
      sourceTitle: "Test",
      messageIndex: 2,
      totalMessages: 10,
    });
    expect(html).toContain('data-action="fork-confirm"');
    expect(html).toContain('data-action="fork-cancel"');
  });

  it("renders explanation text about what gets copied", () => {
    const html = renderForkDialog({
      sourceTitle: "Test",
      messageIndex: 3,
      totalMessages: 10,
    });
    expect(html).toContain("messages will be copied");
  });
});

// ── Controller tests ────────────────────────────────────

describe("ForkDialogController", () => {
  let container: HTMLElement;
  let controller: ForkDialogController;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: ForkDialogOptions): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderForkDialog(options);
    const el = container.querySelector<HTMLElement>(".session-fork-dialog")!;
    controller = createForkDialogController(el, options);
    controller.attach();
    return el;
  }

  it("calls onConfirm with edited title when confirm clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderAndAttach({
      sourceTitle: "Test",
      messageIndex: 2,
      totalMessages: 10,
      onConfirm,
      onCancel,
    });

    const btn = container.querySelector<HTMLElement>(
      '[data-action="fork-confirm"]',
    )!;
    btn.click();

    expect(onConfirm).toHaveBeenCalledWith('Fork of "Test"');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onConfirm with user-edited title", () => {
    const onConfirm = vi.fn();
    renderAndAttach({
      sourceTitle: "Test",
      messageIndex: 2,
      totalMessages: 10,
      onConfirm,
      onCancel: vi.fn(),
    });

    const input = container.querySelector<HTMLInputElement>(
      'input[type="text"]',
    )!;
    input.value = "My custom fork name";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const btn = container.querySelector<HTMLElement>(
      '[data-action="fork-confirm"]',
    )!;
    btn.click();

    expect(onConfirm).toHaveBeenCalledWith("My custom fork name");
  });

  it("calls onCancel when cancel button clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderAndAttach({
      sourceTitle: "Test",
      messageIndex: 2,
      totalMessages: 10,
      onConfirm,
      onCancel,
    });

    const btn = container.querySelector<HTMLElement>(
      '[data-action="fork-cancel"]',
    )!;
    btn.click();

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel on Escape key", () => {
    const onCancel = vi.fn();
    renderAndAttach({
      sourceTitle: "Test",
      messageIndex: 2,
      totalMessages: 10,
      onConfirm: vi.fn(),
      onCancel,
    });

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    expect(onCancel).toHaveBeenCalled();
  });

  it("detach removes event listeners", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderAndAttach({
      sourceTitle: "Test",
      messageIndex: 2,
      totalMessages: 10,
      onConfirm,
      onCancel,
    });

    controller.detach();

    const btn = container.querySelector<HTMLElement>(
      '[data-action="fork-confirm"]',
    )!;
    btn.click();

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
