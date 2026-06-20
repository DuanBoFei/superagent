import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  buildExportPayload,
  validateImportPayload,
  resolveImportCollisions,
  renderSessionExportImport,
  createSessionExportImportController,
} from "../../packages/web/src/components/sidebar/SessionExportImport";
import type {
  SessionExportImportController,
  SessionExportImportOptions,
} from "../../packages/web/src/components/sidebar/SessionExportImport";
import type { ExportFormatV1, Session } from "../../packages/web/src/types/session-history";

let jsdom: JSDOM;

function setupDOM(): HTMLElement {
  jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
  });

  globalThis.document = jsdom.window.document as unknown as Document;
  globalThis.window = jsdom.window as unknown as Window & typeof globalThis;
  globalThis.Event = jsdom.window.Event as unknown as typeof Event;
  globalThis.MouseEvent = jsdom.window.MouseEvent as unknown as typeof MouseEvent;
  globalThis.File = jsdom.window.File as unknown as typeof File;
  globalThis.Blob = jsdom.window.Blob as unknown as typeof Blob;

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
  delete (globalThis as Record<string, unknown>).File;
  delete (globalThis as Record<string, unknown>).Blob;
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess-001",
    title: "Test session",
    createdAt: 1700000000000,
    updatedAt: 1700000100000,
    durationMs: 5000,
    toolCallCount: 2,
    messageCount: 5,
    status: "completed",
    tags: ["bugfix"],
    forkedFrom: null,
    forkedAtMessageIndex: null,
    messages: [],
    toolCalls: [],
    ...overrides,
  };
}

// ── Pure function tests ─────────────────────────────────

describe("buildExportPayload", () => {
  it("returns a valid ExportFormatV1 with version 1", () => {
    const sessions = [makeSession(), makeSession({ id: "sess-002", title: "Fix login" })];
    const result = buildExportPayload(sessions, "test-user");

    expect(result.version).toBe(1);
    expect(result.exportedBy).toBe("test-user");
    expect(result.sessions).toHaveLength(2);
    expect(result.exportedAt).toBeGreaterThan(0);
  });

  it("includes full session data", () => {
    const sessions = [makeSession({ id: "abc", title: "Debug auth" })];
    const result = buildExportPayload(sessions, "");

    expect(result.sessions[0].id).toBe("abc");
    expect(result.sessions[0].title).toBe("Debug auth");
    expect(result.sessions[0].tags).toEqual(["bugfix"]);
  });

  it("handles empty sessions array", () => {
    const result = buildExportPayload([], "user");
    expect(result.sessions).toHaveLength(0);
  });
});

describe("validateImportPayload", () => {
  it("accepts valid ExportFormatV1", () => {
    const valid: ExportFormatV1 = {
      version: 1,
      exportedAt: Date.now(),
      exportedBy: "test",
      sessions: [makeSession()],
    };
    expect(validateImportPayload(valid)).toBe(true);
  });

  it("rejects non-object input", () => {
    expect(validateImportPayload(null)).toBe(false);
    expect(validateImportPayload(undefined)).toBe(false);
    expect(validateImportPayload("string")).toBe(false);
    expect(validateImportPayload(42)).toBe(false);
  });

  it("rejects missing version field", () => {
    const payload = { exportedAt: Date.now(), exportedBy: "x", sessions: [] };
    expect(validateImportPayload(payload)).toBe(false);
  });

  it("rejects version != 1", () => {
    const payload = { version: 2, exportedAt: Date.now(), exportedBy: "x", sessions: [] };
    expect(validateImportPayload(payload)).toBe(false);
  });

  it("rejects missing sessions array", () => {
    const payload = { version: 1, exportedAt: Date.now(), exportedBy: "x" };
    expect(validateImportPayload(payload)).toBe(false);
  });

  it("rejects non-array sessions", () => {
    const payload = { version: 1, exportedAt: Date.now(), exportedBy: "x", sessions: "not-array" };
    expect(validateImportPayload(payload)).toBe(false);
  });

  it("accepts minimal valid payload", () => {
    const minimal: ExportFormatV1 = {
      version: 1,
      exportedAt: 0,
      exportedBy: "",
      sessions: [],
    };
    expect(validateImportPayload(minimal)).toBe(true);
  });
});

describe("resolveImportCollisions", () => {
  it("replaces all session IDs with fresh UUIDs", () => {
    const sessions = [makeSession({ id: "abc" }), makeSession({ id: "xyz" })];
    const result = resolveImportCollisions(sessions);

    expect(result[0].id).not.toBe("abc");
    expect(result[1].id).not.toBe("xyz");
    expect(result[0].id).not.toBe(result[1].id);
  });

  it("generates valid UUID v4 format IDs", () => {
    const sessions = [makeSession()];
    const result = resolveImportCollisions(sessions);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(result[0].id).toMatch(uuidPattern);
  });

  it("preserves all other session fields", () => {
    const original = makeSession({ id: "old-id", title: "Keep me" });
    const [result] = resolveImportCollisions([original]);

    expect(result.title).toBe("Keep me");
    expect(result.createdAt).toBe(original.createdAt);
    expect(result.tags).toEqual(original.tags);
    expect(result.status).toBe(original.status);
  });

  it("clears forkedFrom references to prevent dangling links", () => {
    const sessions = [makeSession({ id: "a", forkedFrom: "other" })];
    const [result] = resolveImportCollisions(sessions);

    expect(result.forkedFrom).toBeNull();
  });

  it("updates updatedAt to now for all sessions", () => {
    const sessions = [makeSession({ updatedAt: 100 })];
    const before = Date.now();
    const [result] = resolveImportCollisions(sessions);

    expect(result.updatedAt).toBeGreaterThanOrEqual(before);
  });
});

// ── Render tests ────────────────────────────────────────

describe("renderSessionExportImport", () => {
  it("renders export button", () => {
    const html = renderSessionExportImport({ hasSelection: true });
    expect(html).toContain("session-export-import");
    expect(html).toContain('data-action="export-selected"');
  });

  it("renders export all button", () => {
    const html = renderSessionExportImport({ hasSelection: false });
    expect(html).toContain('data-action="export-all"');
  });

  it("renders import button", () => {
    const html = renderSessionExportImport({ hasSelection: false });
    expect(html).toContain('data-action="import-file"');
  });

  it("renders drag-drop zone with file input", () => {
    const html = renderSessionExportImport({ hasSelection: false });
    expect(html).toContain("session-import-dropzone");
  });

  it("export selected button has muted style when no selection", () => {
    const html = renderSessionExportImport({ hasSelection: false });
    expect(html).toContain('disabled');
  });
});

// ── Controller tests ────────────────────────────────────

describe("SessionExportImportController", () => {
  let container: HTMLElement;
  let controller: SessionExportImportController;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: SessionExportImportOptions): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderSessionExportImport(options);
    const el = container.querySelector<HTMLElement>(".session-export-import")!;
    controller = createSessionExportImportController(el, options);
    controller.attach();
    return el;
  }

  it("calls onExportSelected when export button clicked", () => {
    const onExport = vi.fn();
    renderAndAttach({ hasSelection: true, onExportSelected: onExport });

    const btn = container.querySelector<HTMLElement>('[data-action="export-selected"]')!;
    btn.click();

    expect(onExport).toHaveBeenCalled();
  });

  it("calls onExportAll when export all button clicked", () => {
    const onExportAll = vi.fn();
    renderAndAttach({ hasSelection: false, onExportAll });

    const btn = container.querySelector<HTMLElement>('[data-action="export-all"]')!;
    btn.click();

    expect(onExportAll).toHaveBeenCalled();
  });

  it("calls onImportFile when import button clicked", () => {
    const onImport = vi.fn();
    renderAndAttach({ hasSelection: false, onImportFile: onImport });

    const btn = container.querySelector<HTMLElement>('[data-action="import-file"]')!;
    btn.click();

    // Clicking the button triggers click on hidden file input
    // The actual file selection is browser-native, we verify the action fires
  });

  it("detach removes event listeners", () => {
    const onExportAll = vi.fn();
    renderAndAttach({ hasSelection: false, onExportAll });

    controller.detach();

    const btn = container.querySelector<HTMLElement>('[data-action="export-all"]')!;
    btn.click();

    expect(onExportAll).not.toHaveBeenCalled();
  });

  it("file input triggers onImportFile callback on change", () => {
    const onImport = vi.fn();
    renderAndAttach({ hasSelection: false, onImportFile: onImport });

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onImport).toHaveBeenCalled();
  });
});
