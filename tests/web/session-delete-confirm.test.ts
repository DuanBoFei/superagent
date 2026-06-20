import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  tombstoneAdd,
  tombstoneRemove,
  tombstoneCleanExpired,
  renderDeleteConfirm,
  createDeleteConfirmController,
  renderUndoToast,
  createUndoToastController,
} from "../../packages/web/src/components/sidebar/SessionDeleteConfirm";
import type {
  DeleteConfirmController,
  DeleteConfirmOptions,
  UndoToastController,
  UndoToastOptions,
  TombstoneEntry,
} from "../../packages/web/src/components/sidebar/SessionDeleteConfirm";
import type { SessionSummary } from "../../packages/web/src/types/session-history";

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

function makeSessionSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: "sess-001",
    title: "Test session",
    firstMessagePreview: "Fix the login bug",
    createdAt: 1700000000000,
    updatedAt: 1700000100000,
    durationMs: 5000,
    toolCallCount: 2,
    messageCount: 5,
    status: "completed",
    tags: ["bugfix"],
    forkedFrom: null,
    ...overrides,
  };
}

// ── Tombstone pure function tests ──────────────────────

describe("tombstoneAdd", () => {
  it("appends a new entry with unique ID to the queue", () => {
    const sessions = [makeSessionSummary()];
    const { queue, entry } = tombstoneAdd([], sessions);

    expect(queue).toHaveLength(1);
    expect(entry.id).toBeTruthy();
    expect(entry.sessions).toEqual(sessions);
  });

  it("sets expiresAt to 5000ms from provided now parameter", () => {
    const sessions = [makeSessionSummary()];
    const now = 1700000000000;
    const { entry } = tombstoneAdd([], sessions, now);

    expect(entry.expiresAt).toBe(now + 5000);
  });

  it("preserves existing entries in the queue", () => {
    const sessions1 = [makeSessionSummary({ id: "a" })];
    const sessions2 = [makeSessionSummary({ id: "b" })];

    const first = tombstoneAdd([], sessions1);
    const second = tombstoneAdd(first.queue, sessions2);

    expect(second.queue).toHaveLength(2);
    expect(second.queue[0].sessions[0].id).toBe("a");
    expect(second.queue[1].sessions[0].id).toBe("b");
  });

  it("generates unique IDs for each tombstone entry", () => {
    const sessions = [makeSessionSummary()];
    const { entry: e1 } = tombstoneAdd([], sessions);
    const { entry: e2 } = tombstoneAdd([], sessions);

    expect(e1.id).not.toBe(e2.id);
  });
});

describe("tombstoneRemove", () => {
  it("removes entry by ID and returns it", () => {
    const sessions = [makeSessionSummary()];
    const { queue, entry } = tombstoneAdd([], sessions);
    const result = tombstoneRemove(queue, entry.id);

    expect(result.queue).toHaveLength(0);
    expect(result.entry).toEqual(entry);
  });

  it("returns null entry when ID not found", () => {
    const result = tombstoneRemove([], "nonexistent");

    expect(result.queue).toHaveLength(0);
    expect(result.entry).toBeNull();
  });

  it("preserves other entries when removing", () => {
    const s1 = [makeSessionSummary({ id: "a" })];
    const s2 = [makeSessionSummary({ id: "b" })];
    const first = tombstoneAdd([], s1);
    const second = tombstoneAdd(first.queue, s2);

    const result = tombstoneRemove(second.queue, first.entry.id);

    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].sessions[0].id).toBe("b");
  });
});

describe("tombstoneCleanExpired", () => {
  it("moves entries past expiresAt into expired array", () => {
    const sessions = [makeSessionSummary()];
    const now = 1700000000000;
    const { queue } = tombstoneAdd([], sessions, now);

    // Expiry is now + 5000 = 1700000005000, check at now + 6000
    const result = tombstoneCleanExpired(queue, now + 6000);

    expect(result.queue).toHaveLength(0);
    expect(result.expired).toHaveLength(1);
    expect(result.expired[0].sessions[0].id).toBe("sess-001");
  });

  it("keeps entries not yet expired in active queue", () => {
    const sessions = [makeSessionSummary()];
    const now = 1700000000000;
    const { queue } = tombstoneAdd([], sessions, now);

    // Check at now + 1000 (not yet expired)
    const result = tombstoneCleanExpired(queue, now + 1000);

    expect(result.queue).toHaveLength(1);
    expect(result.expired).toHaveLength(0);
  });

  it("handles empty queue", () => {
    const result = tombstoneCleanExpired([], Date.now());

    expect(result.queue).toHaveLength(0);
    expect(result.expired).toHaveLength(0);
  });

  it("partitions mixed expired and active entries", () => {
    const now = 1700000000000;
    const { queue: q1 } = tombstoneAdd([], [makeSessionSummary({ id: "old" })], now);
    const { queue: q2 } = tombstoneAdd(q1, [makeSessionSummary({ id: "new" })], now + 10000);

    // At now + 6000: "old" is expired (now + 5000), "new" is active (now + 15000)
    const result = tombstoneCleanExpired(q2, now + 6000);

    expect(result.expired).toHaveLength(1);
    expect(result.expired[0].sessions[0].id).toBe("old");
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].sessions[0].id).toBe("new");
  });
});

// ── Render tests ────────────────────────────────────────

describe("renderDeleteConfirm", () => {
  it("renders single delete confirmation with session title", () => {
    const html = renderDeleteConfirm({
      mode: "single",
      sessionTitle: "Fix login bug",
    });
    expect(html).toContain("session-delete-confirm");
    expect(html).toContain("Fix login bug");
  });

  it("renders bulk delete showing count", () => {
    const html = renderDeleteConfirm({ mode: "bulk", sessionCount: 5 });
    expect(html).toContain("5");
    expect(html).toContain("selected sessions");
  });

  it("renders clear all with text input requiring DELETE typing", () => {
    const html = renderDeleteConfirm({ mode: "clearAll" });
    expect(html).toContain('type="text"');
    expect(html).toContain("DELETE");
    expect(html).toContain('data-action="clear-all-confirm"');
  });

  it("renders confirm and cancel buttons for single mode", () => {
    const html = renderDeleteConfirm({ mode: "single", sessionTitle: "Test" });
    expect(html).toContain('data-action="delete-confirm"');
    expect(html).toContain('data-action="delete-cancel"');
  });

  it("clear all confirm button is disabled by default", () => {
    const html = renderDeleteConfirm({ mode: "clearAll" });
    expect(html).toContain("disabled");
  });

  it("single mode does not render text input", () => {
    const html = renderDeleteConfirm({ mode: "single", sessionTitle: "Test" });
    expect(html).not.toContain('type="text"');
  });
});

// ── Delete Confirm Controller tests ─────────────────────

describe("DeleteConfirmController", () => {
  let container: HTMLElement;
  let controller: DeleteConfirmController;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: DeleteConfirmOptions): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderDeleteConfirm(options);
    const el = container.querySelector<HTMLElement>(".session-delete-confirm")!;
    controller = createDeleteConfirmController(el, options as Parameters<typeof createDeleteConfirmController>[1]);
    controller.attach();
    return el;
  }

  it("calls onConfirm when confirm button clicked (single mode)", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderAndAttach({ mode: "single", sessionTitle: "Test", onConfirm, onCancel });

    const btn = container.querySelector<HTMLElement>('[data-action="delete-confirm"]')!;
    btn.click();

    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderAndAttach({ mode: "single", sessionTitle: "Test", onConfirm, onCancel });

    const btn = container.querySelector<HTMLElement>('[data-action="delete-cancel"]')!;
    btn.click();

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm when bulk confirm clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderAndAttach({ mode: "bulk", sessionCount: 3, onConfirm, onCancel });

    const btn = container.querySelector<HTMLElement>('[data-action="delete-confirm"]')!;
    btn.click();

    expect(onConfirm).toHaveBeenCalled();
  });

  it("clear all: confirm button disabled when input text does not match DELETE", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderAndAttach({ mode: "clearAll", onConfirm, onCancel });

    const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
    const confirmBtn = container.querySelector<HTMLElement>('[data-action="clear-all-confirm"]')!;

    // Type wrong text
    input.value = "WRONG";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    confirmBtn.click();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("clear all: confirm button enabled when input matches DELETE", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderAndAttach({ mode: "clearAll", onConfirm, onCancel });

    const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
    const confirmBtn = container.querySelector<HTMLElement>('[data-action="clear-all-confirm"]')!;

    input.value = "DELETE";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    confirmBtn.click();
    expect(onConfirm).toHaveBeenCalled();
  });

  it("clear all: case-sensitive match required", () => {
    const onConfirm = vi.fn();
    renderAndAttach({ mode: "clearAll", onConfirm, onCancel: vi.fn() });

    const input = container.querySelector<HTMLInputElement>('input[type="text"]')!;
    const confirmBtn = container.querySelector<HTMLElement>('[data-action="clear-all-confirm"]')!;

    input.value = "delete";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    confirmBtn.click();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("detach removes event listeners", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderAndAttach({ mode: "single", sessionTitle: "Test", onConfirm, onCancel });

    controller.detach();

    const btn = container.querySelector<HTMLElement>('[data-action="delete-confirm"]')!;
    btn.click();

    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// ── Undo Toast render tests ─────────────────────────────

describe("renderUndoToast", () => {
  it("renders undo toast with message", () => {
    const html = renderUndoToast({
      message: "1 session deleted",
      remainingSeconds: 5,
      visible: true,
    });
    expect(html).toContain("session-undo-toast");
    expect(html).toContain("1 session deleted");
  });

  it("renders countdown seconds", () => {
    const html = renderUndoToast({
      message: "Deleted",
      remainingSeconds: 3,
      visible: true,
    });
    expect(html).toContain("3");
  });

  it("renders Undo button", () => {
    const html = renderUndoToast({
      message: "Deleted",
      remainingSeconds: 5,
      visible: true,
    });
    expect(html).toContain('data-action="undo-delete"');
  });

  it("renders dismiss button", () => {
    const html = renderUndoToast({
      message: "Deleted",
      remainingSeconds: 5,
      visible: true,
    });
    expect(html).toContain('data-action="undo-dismiss"');
  });

  it("uses hidden class when not visible", () => {
    const html = renderUndoToast({
      message: "Deleted",
      remainingSeconds: 5,
      visible: false,
    });
    expect(html).toContain("hidden");
  });
});

// ── Undo Toast Controller tests ─────────────────────────

describe("UndoToastController", () => {
  let container: HTMLElement;
  let controller: UndoToastController;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
    vi.useRealTimers();
  });

  function renderAndAttach(options: UndoToastOptions): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderUndoToast(options);
    const el = container.querySelector<HTMLElement>(".session-undo-toast")!;
    controller = createUndoToastController(el, options);
    controller.attach();
    controller.startCountdown();
    return el;
  }

  it("calls onUndo when Undo button clicked", () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    renderAndAttach({
      message: "1 session deleted",
      remainingSeconds: 5,
      visible: true,
      durationMs: 5000,
      onUndo,
      onDismiss,
    });

    const undoBtn = container.querySelector<HTMLElement>('[data-action="undo-delete"]')!;
    undoBtn.click();

    expect(onUndo).toHaveBeenCalled();
  });

  it("calls onDismiss when dismiss button clicked", () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    renderAndAttach({
      message: "1 session deleted",
      remainingSeconds: 5,
      visible: true,
      durationMs: 5000,
      onUndo,
      onDismiss,
    });

    const dismissBtn = container.querySelector<HTMLElement>('[data-action="undo-dismiss"]')!;
    dismissBtn.click();

    expect(onDismiss).toHaveBeenCalled();
  });

  it("calls onDismiss after timer expires", () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    renderAndAttach({
      message: "1 session deleted",
      remainingSeconds: 5,
      visible: true,
      durationMs: 5000,
      onUndo,
      onDismiss,
    });

    // Advance past the 5000ms duration
    vi.advanceTimersByTime(5100);

    expect(onDismiss).toHaveBeenCalled();
  });

  it("decrements remainingSeconds on each timer tick", () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    const root = renderAndAttach({
      message: "1 session deleted",
      remainingSeconds: 5,
      visible: true,
      durationMs: 5000,
      onUndo,
      onDismiss,
    });

    // Each tick is 1000ms, 5 seconds total
    vi.advanceTimersByTime(2200);

    // After 2 seconds, remaining should be ~3
    const label = root.querySelector(".session-undo-toast-countdown");
    expect(label).toBeTruthy();
    const remaining = Number(label?.textContent);
    expect(remaining).toBeLessThanOrEqual(3);
  });

  it("detach stops the countdown timer", () => {
    const onDismiss = vi.fn();
    renderAndAttach({
      message: "1 session deleted",
      remainingSeconds: 5,
      visible: true,
      durationMs: 5000,
      onUndo: vi.fn(),
      onDismiss,
    });

    controller.detach();

    // Advance past duration, but timer should be cleared
    vi.advanceTimersByTime(5100);

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
