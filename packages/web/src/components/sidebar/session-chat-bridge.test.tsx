import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSessionChatBridge, PlaybackBanner } from "./session-chat-bridge";
import { useChatStore } from "../../store/chat";
import { useSessionHistoryStore } from "../../store/session-history";
import type { Session } from "../../types/session-history";
import type { Message } from "../../types/message";

vi.mock("./session-fork-dialog", () => ({
  forkSession: vi.fn((session: Session, atIndex: number): Session => ({
    ...session,
    id: "forked-" + session.id,
    title: "Fork of \"" + session.title + "\"",
    forkedFrom: session.id,
    forkedAtMessageIndex: atIndex,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })),
}));

function makeMessage(overrides?: Partial<Message>): Message {
  return {
    id: "m1",
    role: "user",
    content: "Hello",
    timestamp: 1700000000000,
    status: "sent",
    ...overrides,
  };
}

function makeSession(overrides?: Partial<Session>): Session {
  return {
    id: "s1",
    title: "Test Session",
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    durationMs: 60000,
    toolCallCount: 1,
    messageCount: 3,
    status: "completed",
    tags: [],
    forkedFrom: null,
    forkedAtMessageIndex: null,
    messages: [
      makeMessage({ id: "m1", role: "user", content: "msg1" }),
      makeMessage({ id: "m2", role: "assistant", content: "msg2" }),
      makeMessage({ id: "m3", role: "user", content: "msg3" }),
    ],
    toolCalls: [],
    ...overrides,
  };
}

function makePlaybackSlice() {
  return {
    getIsPlaying: () => false,
    getCurrentIndex: () => 0,
    getPlaybackSpeed: () => 1 as const,
    getMaxIndex: () => 0,
    play: vi.fn(),
    pause: vi.fn(),
    stepForward: vi.fn(),
    stepBack: vi.fn(),
    jumpTo: vi.fn(),
    setSpeed: vi.fn(),
    showAll: vi.fn(),
    setMaxIndex: vi.fn(),
    reset: vi.fn(),
    tick: () => false,
  };
}

beforeEach(() => {
  useChatStore.getState().reset();
  useSessionHistoryStore.getState().reset();
});

describe("useSessionChatBridge", () => {
  it("starts in live mode", () => {
    const playback = makePlaybackSlice();
    const { result } = renderHook(() => useSessionChatBridge(playback));
    expect(result.current.getViewMode()).toBe("live");
  });

  it("loadSessionIntoChat switches to playback mode", () => {
    const playback = makePlaybackSlice();
    const { result } = renderHook(() => useSessionChatBridge(playback));
    const session = makeSession();

    result.current.loadSessionIntoChat(session);

    expect(result.current.getViewMode()).toBe("playback");
    expect(playback.setMaxIndex).toHaveBeenCalledWith(2);
    expect(playback.reset).toHaveBeenCalled();
    expect(result.current.getCurrentSession()).toBe(session);
    expect(useSessionHistoryStore.getState().activeSessionId).toBe("s1");
  });

  it("loadSessionIntoChat adds all messages to chat store", () => {
    const playback = makePlaybackSlice();
    const { result } = renderHook(() => useSessionChatBridge(playback));
    const session = makeSession();

    result.current.loadSessionIntoChat(session);

    const messages = useChatStore.getState().sessionMessages["__default__"] ?? [];
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("msg1");
  });

  it("resumeLiveChat switches to live mode", () => {
    const playback = makePlaybackSlice();
    const { result } = renderHook(() => useSessionChatBridge(playback));
    const session = makeSession();

    result.current.loadSessionIntoChat(session);
    result.current.resumeLiveChat();

    expect(result.current.getViewMode()).toBe("live");
    expect(playback.pause).toHaveBeenCalled();
    expect(useChatStore.getState().sessionMessages).toEqual({});
  });

  it("handleSendMessage returns forked:false in live mode", () => {
    const playback = makePlaybackSlice();
    const { result } = renderHook(() => useSessionChatBridge(playback));

    const r = result.current.handleSendMessage("hello");
    expect(r.forked).toBe(false);
  });

  it("handleSendMessage in playback mode forks session", () => {
    const playback = makePlaybackSlice();
    (playback as any).getCurrentIndex = () => 1;
    const { result } = renderHook(() => useSessionChatBridge(playback));
    const session = makeSession();

    result.current.loadSessionIntoChat(session);
    const r = result.current.handleSendMessage("new message");

    expect(r.forked).toBe(true);
    expect(r.newSessionId).toBeDefined();
    expect(r.newSessionId).not.toBe(session.id);
    expect(result.current.getViewMode()).toBe("live");
    expect(playback.pause).toHaveBeenCalled();
  });

  it("handleSendMessage returns forked:false for empty message", () => {
    const playback = makePlaybackSlice();
    const { result } = renderHook(() => useSessionChatBridge(playback));
    result.current.loadSessionIntoChat(makeSession());

    const r = result.current.handleSendMessage("   ");
    expect(r.forked).toBe(false);
  });
});

describe("PlaybackBanner", () => {
  it("renders session title", () => {
    render(
      <PlaybackBanner
        sessionTitle="My Session"
        messageCount={10}
        currentIndex={3}
      />,
    );
    expect(screen.getByText("My Session")).toBeDefined();
  });

  it("renders current index and total", () => {
    render(
      <PlaybackBanner
        sessionTitle="Test"
        messageCount={10}
        currentIndex={3}
      />,
    );
    expect(screen.getByText("4 / 10")).toBeDefined();
  });

  it("calls onResume when button clicked", () => {
    const onResume = vi.fn();
    render(
      <PlaybackBanner
        sessionTitle="Test"
        messageCount={10}
        currentIndex={0}
        onResume={onResume}
      />,
    );
    fireEvent.click(screen.getByText("Resume live chat"));
    expect(onResume).toHaveBeenCalled();
  });
});

// Helper to test hooks without @testing-library/react-hooks
function renderHook<T>(hookFn: (...args: any[]) => T) {
  let result: { current: T };
  function TestComponent({ hookArgs }: { hookArgs: any[] }) {
    result = { current: hookFn(...hookArgs) };
    return null;
  }
  render(<TestComponent hookArgs={[]} />);
  return { result: result! };
}
