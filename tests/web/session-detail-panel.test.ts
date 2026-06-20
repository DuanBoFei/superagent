import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  renderSessionDetailPanel,
  createSessionDetailPanelController,
} from "../../packages/web/src/components/sidebar/SessionDetailPanel";
import type {
  SessionDetailPanelController,
  SessionDetailPanelOptions,
} from "../../packages/web/src/components/sidebar/SessionDetailPanel";
import type { Session, SessionStatus } from "../../packages/web/src/types/session-history";
import type { Message } from "../../packages/web/src/types/message";

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
  globalThis.FocusEvent = jsdom.window.FocusEvent as unknown as typeof FocusEvent;
  globalThis.InputEvent = jsdom.window.InputEvent as unknown as typeof InputEvent;

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
  delete (globalThis as Record<string, unknown>).InputEvent;
}

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
    id: "session-1",
    title: "Bug fix session",
    createdAt: 1700000000000,
    updatedAt: 1700003600000,
    durationMs: 3600000,
    toolCallCount: 2,
    messageCount: 3,
    status: "completed" as SessionStatus,
    tags: ["bugfix", "auth"],
    forkedFrom: null,
    forkedAtMessageIndex: null,
    messages: [
      makeMessage({ id: "msg-1", role: "user", content: "Fix the login bug" }),
      makeMessage({ id: "msg-2", role: "assistant", content: "I found the issue" }),
      makeMessage({ id: "msg-3", role: "user", content: "Great, thanks!" }),
    ],
    toolCalls: [],
    ...overrides,
  };
}

// ── Render tests ──────────────────────────────────────

describe("renderSessionDetailPanel", () => {
  it("renders a session detail panel container", () => {
    const html = renderSessionDetailPanel({ session: makeSession() });
    expect(html).toContain("session-detail-panel");
  });

  it("renders session title in metadata header", () => {
    const html = renderSessionDetailPanel({ session: makeSession({ title: "Bug fix session" }) });
    expect(html).toContain("Bug fix session");
  });

  it("renders read-only badge", () => {
    const html = renderSessionDetailPanel({ session: makeSession() });
    expect(html).toContain("Read-only");
  });

  it("renders session duration in header", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ durationMs: 125000 }),
    });
    // 125 seconds → 02:05
    expect(html).toContain("02:05");
  });

  it("renders close button", () => {
    const html = renderSessionDetailPanel({ session: makeSession() });
    expect(html).toContain('data-action="close-detail"');
  });

  it("renders tag chips in header", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ tags: ["bugfix", "auth"] }),
    });
    expect(html).toContain("bugfix");
    expect(html).toContain("auth");
  });

  it("renders message bubbles for all messages", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({
        messages: [
          makeMessage({ id: "msg-1", role: "user", content: "Hello" }),
          makeMessage({ id: "msg-2", role: "assistant", content: "Hi there" }),
        ],
      }),
    });
    expect(html).toContain("Hello");
    expect(html).toContain("Hi there");
    expect(html).toContain("message-bubble");
  });

  it("renders empty state when session has no messages", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ messages: [], messageCount: 0 }),
    });
    expect(html).toContain("No messages");
  });

  it("renders fork button on each message row", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({
        messages: [
          makeMessage({ id: "msg-1", role: "user" }),
          makeMessage({ id: "msg-2", role: "assistant" }),
        ],
      }),
    });
    const forkButtons = html.match(/data-action="fork-from-here"/g);
    expect(forkButtons).not.toBeNull();
    expect(forkButtons!.length).toBe(2);
  });

  it("renders fork indicator when session is forked from another", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ forkedFrom: "parent-session-id" }),
    });
    expect(html).toContain('data-action="go-to-parent"');
  });

  it("does not render fork indicator when not forked", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ forkedFrom: null }),
    });
    expect(html).not.toContain('data-action="go-to-parent"');
  });

  it("escapes HTML in session title", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ title: '<script>alert("xss")</script>' }),
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders tool call count in header", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ toolCallCount: 5 }),
    });
    expect(html).toContain("5 tools");
  });

  it("renders message count in header", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ messageCount: 12 }),
    });
    expect(html).toContain("12 msgs");
  });

  it("renders status badge for completed session", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ status: "completed" }),
    });
    expect(html).toContain("Completed");
  });

  it("renders status badge for active session", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ status: "active" }),
    });
    expect(html).toContain("Active");
  });

  it("renders status badge for error session", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({ status: "error" }),
    });
    expect(html).toContain("Error");
  });

  it("renders tool call entries when session has toolCalls", () => {
    const html = renderSessionDetailPanel({
      session: makeSession({
        toolCalls: [
          {
            id: "tc-1",
            type: "bash",
            status: "success",
            timestamp: 1700000100000,
            title: "npm install",
            isExpanded: false,
            isCollapsible: true,
            content: {
              command: "npm",
              args: ["install"],
              output: "added 10 packages",
              exitCode: 0,
              durationMs: 5000,
            },
          },
        ],
      }),
    });
    expect(html).toContain("npm install");
    expect(html).toContain("tool-call-entry");
  });
});

// ── Controller tests ─────────────────────────────────

describe("SessionDetailPanelController", () => {
  let container: HTMLElement;
  let controller: SessionDetailPanelController;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: SessionDetailPanelOptions): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderSessionDetailPanel(options);
    const el = container.querySelector<HTMLElement>(".session-detail-panel")!;
    controller = createSessionDetailPanelController(el, options);
    controller.attach();
    return el;
  }

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    renderAndAttach({ session: makeSession(), onClose });

    const closeBtn = container.querySelector<HTMLElement>(
      '[data-action="close-detail"]',
    )!;
    closeBtn.click();

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onFork with message index when fork button clicked", () => {
    const onFork = vi.fn();
    renderAndAttach({
      session: makeSession({
        messages: [
          makeMessage({ id: "msg-1", role: "user" }),
          makeMessage({ id: "msg-2", role: "assistant" }),
        ],
      }),
      onFork,
    });

    // Second fork button → index 1
    const forkBtns = container.querySelectorAll<HTMLElement>(
      '[data-action="fork-from-here"]',
    );
    forkBtns[1].click();

    expect(onFork).toHaveBeenCalledWith(1);
  });

  it("calls onTagClick when tag chip clicked", () => {
    const onTagClick = vi.fn();
    renderAndAttach({
      session: makeSession({ tags: ["bugfix", "auth"] }),
      onTagClick,
    });

    const tagChip = container.querySelector<HTMLElement>('[data-tag="bugfix"]')!;
    tagChip.click();

    expect(onTagClick).toHaveBeenCalledWith("bugfix");
  });

  it("detach removes event listeners", () => {
    const onClose = vi.fn();
    const onFork = vi.fn();
    renderAndAttach({
      session: makeSession({
        messages: [makeMessage({ id: "msg-1", role: "user" })],
      }),
      onClose,
      onFork,
    });

    controller.detach();

    const closeBtn = container.querySelector<HTMLElement>(
      '[data-action="close-detail"]',
    )!;
    closeBtn.click();

    const forkBtn = container.querySelector<HTMLElement>(
      '[data-action="fork-from-here"]',
    )!;
    forkBtn.click();

    expect(onClose).not.toHaveBeenCalled();
    expect(onFork).not.toHaveBeenCalled();
  });
});
