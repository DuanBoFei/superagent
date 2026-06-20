import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  renderPlaybackBanner,
  createPlaybackBannerController,
  createSessionChatBridge,
} from "../../packages/web/src/components/sidebar/SessionChatBridge";
import type {
  PlaybackBannerOptions,
  PlaybackBannerController,
  SessionChatBridge,
} from "../../packages/web/src/components/sidebar/SessionChatBridge";
import type { ChatStore, ChatState } from "../../packages/web/src/store/chat";
import type { SessionHistorySlice } from "../../packages/web/src/store/slices/session-history.slice";
import type { SessionPlaybackSlice } from "../../packages/web/src/hooks/useSessionPlayback";
import type { SessionDbService } from "../../packages/web/src/services/session-db.service";
import type { Session } from "../../packages/web/src/types/session-history";
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
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    role: "user",
    content: "Hello",
    timestamp: 1700000000000,
    status: "sent",
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess-001",
    title: "Fix login bug",
    createdAt: 1700000000000,
    updatedAt: 1700000100000,
    durationMs: 5000,
    toolCallCount: 2,
    messageCount: 3,
    status: "completed",
    tags: [],
    forkedFrom: null,
    forkedAtMessageIndex: null,
    messages: [makeMessage(), makeMessage({ id: "msg-2", role: "assistant", content: "Hi" }), makeMessage({ id: "msg-3", role: "user", content: "Fix it" })],
    toolCalls: [],
    ...overrides,
  };
}

function makeChatStore(initialState?: Partial<ChatState>): ChatStore & { _state: ChatState } {
  const state: ChatState = {
    messages: [],
    currentSessionId: "live-session-1",
    isConnected: true,
    pendingQueue: [],
    ...initialState,
  };

  return {
    _state: state,
    getState: () => state,
    setConnected: (c) => { state.isConnected = c; },
    setSession: (id) => { state.messages = []; state.currentSessionId = id; state.pendingQueue = []; },
    replaceMessages: (msgs) => { state.messages = [...msgs]; },
    addMessage: (msg) => { state.messages = [...state.messages, msg]; },
    updateMessage: () => {},
    appendToken: () => {},
    markComplete: () => {},
    markError: () => {},
    enqueueMessage: () => true,
    processNextMessage: () => undefined,
    dequeueMessage: () => {},
  };
}

function makeHistorySlice(): SessionHistorySlice & { _activeId: string | null } {
  let activeId: string | null = null;

  return {
    _activeId: null,
    getSessions: () => [],
    getFilters: () => ({ text: "", dateRange: null, statusFilter: null, tagsFilter: null }),
    getActiveSessionId: () => activeId,
    getSidebarOpen: () => true,
    getSidebarWidth: () => 360,
    getSidebarMode: () => "dock",
    setFilters: () => {},
    resetFilters: () => {},
    toggleSidebar: () => {},
    setSidebarWidth: () => {},
    setSidebarMode: () => {},
    selectSession: (id) => { activeId = id; },
    deselectSession: () => { activeId = null; },
    refreshSessions: async () => {},
    updateTags: async () => {},
    updateTitle: async () => {},
  };
}

function makePlaybackSlice(): SessionPlaybackSlice & { _state: { isPlaying: boolean; currentIndex: number; maxIndex: number } } {
  const s = {
    _state: { isPlaying: false, currentIndex: 0, maxIndex: 0 },
    getIsPlaying: () => s._state.isPlaying,
    getCurrentIndex: () => s._state.currentIndex,
    getPlaybackSpeed: () => 1 as const,
    getMaxIndex: () => s._state.maxIndex,
    play: () => { s._state.isPlaying = true; },
    pause: () => { s._state.isPlaying = false; },
    stepForward: () => { s._state.currentIndex = Math.min(s._state.currentIndex + 1, s._state.maxIndex); },
    stepBack: () => { s._state.currentIndex = Math.max(0, s._state.currentIndex - 1); },
    jumpTo: (i) => { s._state.currentIndex = Math.max(0, Math.min(i, s._state.maxIndex)); },
    setSpeed: () => {},
    showAll: () => { s._state.currentIndex = s._state.maxIndex; s._state.isPlaying = false; },
    setMaxIndex: (v) => { s._state.maxIndex = v; },
    reset: () => { s._state.isPlaying = false; s._state.currentIndex = 0; },
    tick: () => {
      if (!s._state.isPlaying || s._state.currentIndex >= s._state.maxIndex) return false;
      s._state.currentIndex++;
      return true;
    },
  };
  return s;
}

function makeDbService(sessions: Map<string, Session> = new Map()): SessionDbService {
  return {
    getSession: async (id) => sessions.get(id) ?? null,
    getSessionSummaries: async () => [],
    updateSession: async () => {},
    deleteSession: async () => {},
    deleteSessions: async () => {},
    searchSessions: async () => [],
    addTag: async () => {},
    removeTag: async () => {},
    getAllTags: async () => [],
    close: () => {},
  } as unknown as SessionDbService;
}

// ── Playback banner render tests ────────────────────────

describe("renderPlaybackBanner", () => {
  it("shows session title in banner", () => {
    const html = renderPlaybackBanner({
      sessionTitle: "Fix login bug",
      messageCount: 10,
      currentIndex: 5,
    });
    expect(html).toContain("Fix login bug");
  });

  it("shows playback progress", () => {
    const html = renderPlaybackBanner({
      sessionTitle: "Test",
      messageCount: 20,
      currentIndex: 7,
    });
    expect(html).toContain("8"); // 1-indexed display
    expect(html).toContain("20");
  });

  it("renders resume button", () => {
    const html = renderPlaybackBanner({
      sessionTitle: "Test",
      messageCount: 5,
      currentIndex: 0,
    });
    expect(html).toContain('data-action="resume-live"');
    expect(html).toContain("Resume live chat");
  });

  it("shows indicator for history viewing mode", () => {
    const html = renderPlaybackBanner({
      sessionTitle: "Test",
      messageCount: 5,
      currentIndex: 0,
    });
    expect(html).toContain("Viewing history");
  });

  it("escapes HTML in session title", () => {
    const html = renderPlaybackBanner({
      sessionTitle: '<script>alert("xss")</script>',
      messageCount: 5,
      currentIndex: 0,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ── Playback banner controller tests ────────────────────

describe("PlaybackBannerController", () => {
  let container: HTMLElement;
  let controller: PlaybackBannerController;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: PlaybackBannerOptions): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderPlaybackBanner(options);
    const el = container.querySelector<HTMLElement>(".playback-banner")!;
    controller = createPlaybackBannerController(el, options);
    controller.attach();
    return el;
  }

  it("calls onResume when resume button clicked", () => {
    const onResume = vi.fn();
    renderAndAttach({
      sessionTitle: "Test",
      messageCount: 10,
      currentIndex: 3,
      onResume,
    });

    const btn = container.querySelector<HTMLElement>('[data-action="resume-live"]')!;
    btn.click();

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("detach removes event listeners", () => {
    const onResume = vi.fn();
    renderAndAttach({
      sessionTitle: "Test",
      messageCount: 10,
      currentIndex: 3,
      onResume,
    });

    controller.detach();

    const btn = container.querySelector<HTMLElement>('[data-action="resume-live"]')!;
    btn.click();

    expect(onResume).not.toHaveBeenCalled();
  });
});

// ── SessionChatBridge tests ──────────────────────────────

describe("SessionChatBridge", () => {
  let chatStore: ReturnType<typeof makeChatStore>;
  let historySlice: ReturnType<typeof makeHistorySlice>;
  let playbackSlice: ReturnType<typeof makePlaybackSlice>;
  let dbService: SessionDbService;
  let sessions: Map<string, Session>;
  let bridge: SessionChatBridge;

  beforeEach(() => {
    chatStore = makeChatStore();
    historySlice = makeHistorySlice();
    playbackSlice = makePlaybackSlice();
    sessions = new Map();
    dbService = makeDbService(sessions);
    bridge = createSessionChatBridge({
      chatStore,
      historySlice,
      playbackSlice,
      dbService,
    });
  });

  it("starts in live mode", () => {
    expect(bridge.getViewMode()).toBe("live");
    expect(bridge.getCurrentSession()).toBeNull();
  });

  it("loads session into chat and enters playback mode", async () => {
    const session = makeSession();
    sessions.set(session.id, session);

    await bridge.loadSessionIntoChat(session.id);

    expect(bridge.getViewMode()).toBe("playback");
    expect(bridge.getCurrentSession()).not.toBeNull();
    expect(chatStore.getState().messages).toHaveLength(3);
    expect(chatStore.getState().messages[0].content).toBe("Hello");
    expect(historySlice.getActiveSessionId()).toBe(session.id);
  });

  it("sets playback max index when loading session", async () => {
    const session = makeSession();
    sessions.set(session.id, session);

    await bridge.loadSessionIntoChat(session.id);

    expect(playbackSlice.getMaxIndex()).toBe(2); // 3 messages → maxIndex 2
  });

  it("resets playback index when loading new session", async () => {
    const session = makeSession();
    sessions.set(session.id, session);
    playbackSlice.stepForward(); // advance to index 1
    playbackSlice.stepForward(); // index 2

    await bridge.loadSessionIntoChat(session.id);

    expect(playbackSlice.getCurrentIndex()).toBe(0);
  });

  it("resumeLiveChat clears messages and returns to live mode", async () => {
    const session = makeSession();
    sessions.set(session.id, session);
    await bridge.loadSessionIntoChat(session.id);
    expect(bridge.getViewMode()).toBe("playback");

    bridge.resumeLiveChat();

    expect(bridge.getViewMode()).toBe("live");
    expect(bridge.getCurrentSession()).toBeNull();
    expect(chatStore.getState().messages).toHaveLength(0);
  });

  it("resumeLiveChat deselects session in history", async () => {
    const session = makeSession();
    sessions.set(session.id, session);
    await bridge.loadSessionIntoChat(session.id);

    bridge.resumeLiveChat();

    expect(historySlice.getActiveSessionId()).toBeNull();
  });

  it("handleSendMessage in live mode returns not-forked", () => {
    const result = bridge.handleSendMessage("Hello world");
    expect(result.forked).toBe(false);
  });

  it("handleSendMessage in playback mode forks session", async () => {
    const session = makeSession();
    sessions.set(session.id, session);
    await bridge.loadSessionIntoChat(session.id);

    const result = bridge.handleSendMessage("New message from history");

    expect(result.forked).toBe(true);
    expect(result.newSessionId).toBeDefined();
    expect(result.newSessionId).not.toBe(session.id);
  });

  it("handleSendMessage in playback mode switches to live mode", async () => {
    const session = makeSession();
    sessions.set(session.id, session);
    await bridge.loadSessionIntoChat(session.id);

    bridge.handleSendMessage("New message");

    expect(bridge.getViewMode()).toBe("live");
    expect(playbackSlice.getIsPlaying()).toBe(false);
  });

  it("handleSendMessage in playback mode with empty content returns not-forked", async () => {
    const session = makeSession();
    sessions.set(session.id, session);
    await bridge.loadSessionIntoChat(session.id);

    const result = bridge.handleSendMessage("");

    expect(result.forked).toBe(false);
    expect(bridge.getViewMode()).toBe("playback"); // stays in playback
  });

  it("handleSendMessage forks at current playback index", async () => {
    const session = makeSession({ messages: [
      makeMessage({ id: "m1", content: "A" }),
      makeMessage({ id: "m2", role: "assistant", content: "B" }),
      makeMessage({ id: "m3", content: "C" }),
      makeMessage({ id: "m4", role: "assistant", content: "D" }),
      makeMessage({ id: "m5", content: "E" }),
    ]});
    sessions.set(session.id, session);
    await bridge.loadSessionIntoChat(session.id);

    // Advance playback to message index 2
    playbackSlice.stepForward();
    playbackSlice.stepForward();

    bridge.handleSendMessage("Continue from here");

    // The fork should have been at index 2 (3rd message)
    const forkedSessionId = historySlice.getActiveSessionId();
    expect(forkedSessionId).not.toBeNull();
    expect(forkedSessionId).not.toBe(session.id);
  });

  it("loadSessionIntoChat does nothing for non-existent session", async () => {
    await bridge.loadSessionIntoChat("nonexistent");

    expect(bridge.getViewMode()).toBe("live");
    expect(chatStore.getState().messages).toHaveLength(0);
  });

  it("getPlaybackBannerHtml returns banner when in playback mode", async () => {
    const session = makeSession();
    sessions.set(session.id, session);
    await bridge.loadSessionIntoChat(session.id);

    const banner = bridge.getPlaybackBannerHtml();
    expect(banner).toContain("Viewing history");
    expect(banner).toContain(session.title);
  });

  it("getPlaybackBannerHtml returns empty string when in live mode", () => {
    expect(bridge.getPlaybackBannerHtml()).toBe("");
  });
});
