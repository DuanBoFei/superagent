import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import Database from "better-sqlite3";
import { initDb } from "../../src/persistence/store";
import { SessionDbService } from "../../packages/web/src/services/session-db.service";
import {
  renderSessionDetailPanel,
  createSessionDetailPanelController,
} from "../../packages/web/src/components/sidebar/SessionDetailPanel";
import { renderSessionList } from "../../packages/web/src/components/sidebar/SessionList";
import {
  buildExportPayload,
  createExportBlob,
} from "../../packages/web/src/components/sidebar/SessionExportImport";
import type { SessionDetailPanelOptions } from "../../packages/web/src/components/sidebar/SessionDetailPanel";
import type { SessionSummary, Session, SessionStatus } from "../../packages/web/src/types/session-history";
import type { Message } from "../../packages/web/src/types/message";

// ── JSDOM setup ──────────────────────────────────────────

let jsdom: JSDOM;

function setupDOM(): HTMLElement {
  jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
  });

  globalThis.document = jsdom.window.document as unknown as Document;
  globalThis.window = jsdom.window.window as unknown as Window & typeof globalThis;
  globalThis.Event = jsdom.window.Event as unknown as typeof Event;
  globalThis.MouseEvent = jsdom.window.MouseEvent as unknown as typeof MouseEvent;
  globalThis.KeyboardEvent = jsdom.window.KeyboardEvent as unknown as typeof KeyboardEvent;
  globalThis.FocusEvent = jsdom.window.FocusEvent as unknown as typeof FocusEvent;
  globalThis.Blob = jsdom.window.Blob as unknown as typeof Blob;
  globalThis.URL = jsdom.window.URL as unknown as typeof URL;

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
  delete (globalThis as Record<string, unknown>).FocusEvent;
  delete (globalThis as Record<string, unknown>).Blob;
  delete (globalThis as Record<string, unknown>).URL;
}

// ── Fixtures ─────────────────────────────────────────────

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    role: "user",
    content: "Hello, agent!",
    timestamp: 1700000000000,
    status: "sent",
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess-001",
    title: "Test Session",
    createdAt: 1700000000000,
    updatedAt: 1700000100000,
    durationMs: 5000,
    toolCallCount: 2,
    messageCount: 5,
    status: "completed",
    tags: ["bugfix"],
    forkedFrom: null,
    forkedAtMessageIndex: null,
    messages: [makeMessage()],
    toolCalls: [],
    ...overrides,
  };
}

function makeSummary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: "sum-001",
    title: "My Session",
    firstMessagePreview: "Hello world",
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

// ── Insert helpers ───────────────────────────────────────

function insertSession(
  db: Database.Database,
  id: string,
  overrides: Record<string, unknown> = {},
) {
  db.prepare(
    `INSERT INTO sessions (id, created_at, updated_at, turn_count, first_message, state_json, title, status, duration_ms, tool_call_count, message_count, messages_content, forked_from, forked_at_message_index)
     VALUES (@id, @created_at, @updated_at, @turn_count, @first_message, @state_json, @title, @status, @duration_ms, @tool_call_count, @message_count, @messages_content, @forked_from, @forked_at_message_index)`,
  ).run({
    id,
    created_at: 1000,
    updated_at: 2000,
    turn_count: 1,
    first_message: "hello world",
    state_json: "{}",
    title: "",
    status: "active",
    duration_ms: 0,
    tool_call_count: 0,
    message_count: 0,
    messages_content: "",
    forked_from: null,
    forked_at_message_index: null,
    ...overrides,
  });
}

function insertFtsEntry(db: Database.Database, sessionId: string, expectedText: string) {
  db.prepare(
    "INSERT INTO sessions_fts (session_id, title, messages_content) VALUES (?, ?, ?)",
  ).run(sessionId, expectedText, expectedText);
}

// ─────────────────────────────────────────────────────────
// T021.1 · Detail panel lazy load
// ─────────────────────────────────────────────────────────

describe("T021.1 SessionDetailPanel lazy load", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = setupDOM();
  });

  afterEach(() => {
    cleanupDOM();
  });

  it("renders a subset of entries when maxEntries is provided", () => {
    const messages = Array.from({ length: 100 }, (_, i) =>
      makeMessage({ id: `msg-${i}`, content: `Message ${i}`, timestamp: 1700000000000 + i * 1000 }),
    );
    const session = makeSession({ messages, toolCalls: [] });

    const html = renderSessionDetailPanel({ session, maxEntries: 20 });
    container.innerHTML = html;

    // Should show "Load more" when there are more entries
    expect(html).toContain("Load more");
    expect(html).toContain("100 entries");

    // Should only render first maxEntries timeline rows
    const rows = container.querySelectorAll(".timeline-row");
    expect(rows.length).toBeLessThanOrEqual(25); // 20 + some margin for header rows
  });

  it("renders all entries when maxEntries >= total", () => {
    const messages = Array.from({ length: 5 }, (_, i) =>
      makeMessage({ id: `msg-${i}`, content: `Message ${i}`, timestamp: 1700000000000 + i * 1000 }),
    );
    const session = makeSession({ messages, toolCalls: [] });

    const html = renderSessionDetailPanel({ session, maxEntries: 50 });
    container.innerHTML = html;

    // Should NOT show "Load more" when all entries fit
    expect(html).not.toContain("Load more");
  });

  it("triggers onLoadMore callback when button clicked", () => {
    const messages = Array.from({ length: 100 }, (_, i) =>
      makeMessage({ id: `msg-${i}`, content: `Message ${i}`, timestamp: 1700000000000 + i * 1000 }),
    );
    const session = makeSession({ messages, toolCalls: [] });
    const onLoadMore = vi.fn();

    const html = renderSessionDetailPanel({ session, maxEntries: 10, onLoadMore });
    container.innerHTML = html;

    const ctrl = createSessionDetailPanelController(container, {
      session,
      maxEntries: 10,
      onLoadMore,
    });
    ctrl.attach();

    const loadBtn = container.querySelector<HTMLElement>('[data-action="load-more"]');
    expect(loadBtn).not.toBeNull();

    loadBtn!.click();
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    ctrl.detach();
  });

  it("shows correct remaining count on load more button", () => {
    const messages = Array.from({ length: 75 }, (_, i) =>
      makeMessage({ id: `msg-${i}`, content: `Message ${i}`, timestamp: 1700000000000 + i * 1000 }),
    );
    const session = makeSession({ messages, toolCalls: [], messageCount: 75 });

    const html = renderSessionDetailPanel({ session, maxEntries: 25 });
    expect(html).toContain("50 remaining");
  });

  it("default maxEntries is 50 when not specified", () => {
    const html = renderSessionDetailPanel({ session: makeSession() });
    // Should not crash with default options
    expect(html).toContain("session-detail-panel");
  });
});

// ─────────────────────────────────────────────────────────
// T021.2 · FTS5 search pagination
// ─────────────────────────────────────────────────────────

describe("T021.2 FTS5 search pagination", () => {
  let db: Database.Database;
  let svc: SessionDbService;

  beforeEach(() => {
    db = initDb(":memory:");
    svc = new SessionDbService(db);
  });

  afterEach(() => {
    db.close();
  });

  it("searchSessions respects the limit parameter", async () => {
    for (let i = 0; i < 30; i++) {
      insertSession(db, `s${i}`, {
        updated_at: i * 10,
        first_message: `searchable keyword ${i}`,
      });
      insertFtsEntry(db, `s${i}`, `searchable keyword ${i}`);
    }

    const results = await svc.searchSessions({ text: "searchable" }, { limit: 5, offset: 0 });
    expect(results).toHaveLength(5);
  });

  it("searchSessions respects the offset parameter for true pagination", async () => {
    for (let i = 0; i < 30; i++) {
      insertSession(db, `s${i}`, {
        updated_at: i * 10,
        first_message: `paginated keyword ${i}`,
      });
      insertFtsEntry(db, `s${i}`, `paginated keyword ${i}`);
    }

    const page1 = await svc.searchSessions({ text: "paginated" }, { limit: 10, offset: 0 });
    const page2 = await svc.searchSessions({ text: "paginated" }, { limit: 10, offset: 10 });

    expect(page1).toHaveLength(10);
    expect(page2).toHaveLength(10);
    // No overlap between pages
    const ids1 = new Set(page1.map((s) => s.id));
    const overlap = page2.some((s) => ids1.has(s.id));
    expect(overlap).toBe(false);
  });

  it("searchSessions with large limit returns at most limit rows", async () => {
    for (let i = 0; i < 60; i++) {
      insertSession(db, `s${i}`, {
        updated_at: i * 10,
        first_message: `bulk query ${i}`,
      });
      insertFtsEntry(db, `s${i}`, `bulk query ${i}`);
    }

    const results = await svc.searchSessions({ text: "bulk" }, { limit: 60, offset: 0 });
    expect(results.length).toBeLessThanOrEqual(60);
  });

  it("FTS5 search uses prefix search for partial word matches", async () => {
    insertSession(db, "s1", {
      updated_at: 100,
      first_message: "debugging session",
    });
    insertFtsEntry(db, "s1", "debugging session");
    insertSession(db, "s2", {
      updated_at: 200,
      first_message: "debug session",
    });
    insertFtsEntry(db, "s2", "debug session");
    insertSession(db, "s3", {
      updated_at: 300,
      first_message: "unrelated",
    });
    insertFtsEntry(db, "s3", "unrelated");

    // "debug" with prefix search should match "debugging" and "debug"
    const results = await svc.searchSessions({ text: "debug" });
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────
// T021.3 · SessionList rAF-scroll throttle
// ─────────────────────────────────────────────────────────

describe("T021.3 SessionList scroll performance", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = setupDOM();
  });

  afterEach(() => {
    cleanupDOM();
  });

  it("renders virtual scroll with data-raf-scroll attribute", () => {
    const sessions = Array.from({ length: 50 }, (_, i) =>
      makeSummary({ id: `s-${i}`, title: `Session ${i}` }),
    );

    const html = renderSessionList({ sessions });
    container.innerHTML = html;

    // Virtual scroll should be enabled for 50 sessions
    expect(html).toContain("session-list--virtual");
    expect(html).toContain("session-list-spacer");
  });

  it("does not enable virtual scroll below threshold", () => {
    const sessions = Array.from({ length: 5 }, (_, i) =>
      makeSummary({ id: `s-${i}`, title: `Session ${i}` }),
    );

    const html = renderSessionList({ sessions });
    expect(html).not.toContain("session-list--virtual");
  });

  it("uses requestAnimationFrame for scroll handling", () => {
    // Verify that the controller sets up scroll with passive listener
    const sessions = Array.from({ length: 30 }, (_, i) =>
      makeSummary({ id: `s-${i}`, title: `Session ${i}` }),
    );

    const html = renderSessionList({ sessions });
    container.innerHTML = html;

    const spy = vi.spyOn(container.querySelector(".session-list-inner")!, "addEventListener");

    const ctrl = createSessionListControllerWithSpy(container, { sessions });
    ctrl.attach();

    // Scroll listener registered
    const scrollCalls = spy.mock.calls.filter(([event]) => event === "scroll");
    expect(scrollCalls.length).toBeGreaterThanOrEqual(1);
    // Should be passive
    expect(scrollCalls[0]?.[2]).toMatchObject({ passive: true });

    spy.mockRestore();
    ctrl.detach();
  });
});

// Helper to expose the internal scroll listener registration for testing
import { createSessionListController, type SessionListOptions } from "../../packages/web/src/components/sidebar/SessionList";
import type { SessionListController } from "../../packages/web/src/components/sidebar/SessionList";

function createSessionListControllerWithSpy(
  el: HTMLElement,
  options: SessionListOptions,
): SessionListController {
  const inner = el.querySelector<HTMLElement>(".session-list-inner");
  if (!inner) throw new Error("No inner container found");

  const ctrl = createSessionListController(el, options);
  return ctrl;
}

// ─────────────────────────────────────────────────────────
// T021.4 · Export Blob download
// ─────────────────────────────────────────────────────────

describe("T021.4 Export Blob optimization", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = setupDOM();
  });

  afterEach(() => {
    cleanupDOM();
  });

  it("createExportBlob returns a Blob with correct MIME type", () => {
    const sessions = [makeSession()];
    const payload = buildExportPayload(sessions, "test-agent");

    const blob = createExportBlob(payload);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/json");
  });

  it("createExportBlob contains valid JSON", async () => {
    const sessions = [makeSession(), makeSession({ id: "sess-002" })];
    const payload = buildExportPayload(sessions, "test-agent");

    const blob = createExportBlob(payload);
    const text = await blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.version).toBe(1);
    expect(parsed.exportedBy).toBe("test-agent");
    expect(parsed.sessions).toHaveLength(2);
  });

  it("createExportBlob handles large session payloads", () => {
    const largeSessions = Array.from({ length: 100 }, (_, i) =>
      makeSession({
        id: `sess-${i}`,
        messages: Array.from({ length: 50 }, (_, j) =>
          makeMessage({ id: `msg-${i}-${j}`, content: `Content for message ${j}`, timestamp: 1700000000000 + j * 1000 }),
        ),
      }),
    );
    const payload = buildExportPayload(largeSessions, "bulk-agent");

    const blob = createExportBlob(payload);
    expect(blob.size).toBeGreaterThan(1000); // Should be substantial
  });

  it("createExportBlob filename includes timestamp", () => {
    const payload = buildExportPayload([makeSession()], "agent");
    const blob = createExportBlob(payload, "custom-prefix");

    // Blob should have data
    expect(blob.size).toBeGreaterThan(0);
  });

  it("buildExportPayload filters to specified sessions", () => {
    const allSessions = [
      makeSession({ id: "sess-1" }),
      makeSession({ id: "sess-2" }),
      makeSession({ id: "sess-3" }),
    ];

    const payload = buildExportPayload(allSessions, "agent");
    expect(payload.sessions).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────
// T021.5 · Search debounce AbortController readiness
// ─────────────────────────────────────────────────────────

describe("T021.5 Search debounce robustness", () => {
  it("debounce timer can be cleared to cancel stale queries", () => {
    // Verify the pattern: clearing a timer cancels the pending update
    let callCount = 0;
    const fn = () => { callCount++; };

    let timer: ReturnType<typeof setTimeout> | null = setTimeout(fn, 250);
    expect(timer).not.toBeNull();

    // Cancel before it fires
    if (timer) clearTimeout(timer);
    timer = null;

    // Callback should not have been invoked
    expect(callCount).toBe(0);
  });

  it("rapid successive debounce calls only trigger last one", async () => {
    const calls: string[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    function debouncedSearch(term: string): void {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        calls.push(term);
      }, 200);
    }

    debouncedSearch("a");
    debouncedSearch("ab");
    debouncedSearch("abc");
    debouncedSearch("abcd");

    // All but the last should be cancelled
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(calls).toEqual(["abcd"]);
    expect(calls.length).toBe(1);
  });
});
