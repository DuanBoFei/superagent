import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "./chat";
import type { Message } from "../types/message";

function makeMessage(overrides?: Partial<Message>): Message {
  return {
    id: "msg-1",
    role: "user",
    content: "Hello",
    timestamp: Date.now(),
    status: "sent",
    ...overrides,
  };
}

function msgs(sid?: string): Message[] {
  const state = useChatStore.getState();
  const key = sid ?? state.activeSessionId ?? "__default__";
  return state.sessionMessages[key] ?? [];
}

describe("ChatStore", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  describe("initial state", () => {
    it("has empty sessionMessages", () => {
      expect(useChatStore.getState().sessionMessages).toEqual({});
    });

    it("has empty input", () => {
      expect(useChatStore.getState().input).toBe("");
    });

    it("has disconnected status", () => {
      expect(useChatStore.getState().connectionStatus).toBe("disconnected");
    });

    it("is not streaming", () => {
      expect(useChatStore.getState().isStreaming).toBe(false);
    });

    it("has null activeSessionId", () => {
      expect(useChatStore.getState().activeSessionId).toBeNull();
    });
  });

  describe("addMessage", () => {
    it("appends a message to default session", () => {
      const msg = makeMessage();
      useChatStore.getState().addMessage(msg);
      expect(msgs()).toHaveLength(1);
      expect(msgs()[0]).toEqual(msg);
    });

    it("appends a message to specific session", () => {
      const msg = makeMessage();
      useChatStore.getState().addMessage(msg, "session-A");
      expect(msgs("session-A")).toHaveLength(1);
      expect(msgs("session-A")[0]).toEqual(msg);
      expect(msgs("session-B")).toHaveLength(0);
    });

    it("sets isStreaming when message status is streaming", () => {
      useChatStore.getState().setActiveSession("s1");
      const msg = makeMessage({ status: "streaming" });
      useChatStore.getState().addMessage(msg, "s1");
      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    it("preserves message order", () => {
      useChatStore.getState().setActiveSession("s1");
      const first = makeMessage({ id: "1", content: "first" });
      const second = makeMessage({ id: "2", content: "second" });
      useChatStore.getState().addMessage(first, "s1");
      useChatStore.getState().addMessage(second, "s1");
      expect(msgs("s1").map((m) => m.id)).toEqual(["1", "2"]);
    });
  });

  describe("appendToken", () => {
    it("appends token to existing message content", () => {
      useChatStore.getState().setActiveSession("s1");
      const msg = makeMessage({ id: "a1", content: "He", status: "streaming" });
      useChatStore.getState().addMessage(msg, "s1");
      useChatStore.getState().appendToken("a1", "llo", "s1");
      expect(msgs("s1")[0]?.content).toBe("Hello");
    });

    it("keeps status as streaming", () => {
      useChatStore.getState().setActiveSession("s1");
      const msg = makeMessage({ id: "a1", content: "", status: "streaming" });
      useChatStore.getState().addMessage(msg, "s1");
      useChatStore.getState().appendToken("a1", "x", "s1");
      expect(msgs("s1")[0]?.status).toBe("streaming");
    });

    it("creates placeholder for unknown message id", () => {
      useChatStore.getState().setActiveSession("s1");
      useChatStore.getState().appendToken("new-id", "hello", "s1");
      const messages = msgs("s1");
      expect(messages).toHaveLength(1);
      expect(messages[0]?.id).toBe("new-id");
      expect(messages[0]?.content).toBe("hello");
      expect(messages[0]?.role).toBe("assistant");
    });

    it("sets isStreaming to true", () => {
      useChatStore.getState().setActiveSession("s1");
      useChatStore.getState().appendToken("x", "t", "s1");
      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    it("multiple tokens accumulate", () => {
      useChatStore.getState().setActiveSession("s1");
      useChatStore.getState().appendToken("m1", "a", "s1");
      useChatStore.getState().appendToken("m1", "b", "s1");
      useChatStore.getState().appendToken("m1", "c", "s1");
      expect(msgs("s1")[0]?.content).toBe("abc");
    });
  });

  describe("markComplete", () => {
    it("sets message status to sent", () => {
      useChatStore.getState().setActiveSession("s1");
      const msg = makeMessage({ id: "x", status: "streaming" });
      useChatStore.getState().addMessage(msg, "s1");
      useChatStore.getState().markComplete("x", undefined, "s1");
      expect(msgs("s1")[0]?.status).toBe("sent");
    });

    it("sets isStreaming to false", () => {
      useChatStore.getState().setActiveSession("s1");
      useChatStore.getState().addMessage(
        makeMessage({ id: "x", status: "streaming" }),
        "s1",
      );
      useChatStore.getState().markComplete("x", undefined, "s1");
      expect(useChatStore.getState().isStreaming).toBe(false);
    });

    it("does not affect other sessions", () => {
      useChatStore.getState().addMessage(makeMessage({ id: "a" }), "s1");
      useChatStore.getState().addMessage(makeMessage({ id: "b" }), "s2");
      useChatStore.getState().markComplete("a", undefined, "s1");
      expect(msgs("s2")).toHaveLength(1);
    });
  });

  describe("markError", () => {
    it("sets message status to error with message", () => {
      useChatStore.getState().setActiveSession("s1");
      const msg = makeMessage({ id: "e1", status: "streaming" });
      useChatStore.getState().addMessage(msg, "s1");
      useChatStore.getState().markError("e1", "timeout", "s1");
      const updated = msgs("s1")[0];
      expect(updated?.status).toBe("error");
      expect(updated?.error).toBe("timeout");
    });

    it("sets isStreaming to false", () => {
      useChatStore.getState().setActiveSession("s1");
      useChatStore.getState().addMessage(
        makeMessage({ id: "e1", status: "streaming" }),
        "s1",
      );
      useChatStore.getState().markError("e1", "err", "s1");
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe("setInput / clearInput", () => {
    it("sets input value", () => {
      useChatStore.getState().setInput("fix the bug");
      expect(useChatStore.getState().input).toBe("fix the bug");
    });

    it("clears input", () => {
      useChatStore.getState().setInput("something");
      useChatStore.getState().clearInput();
      expect(useChatStore.getState().input).toBe("");
    });
  });

  describe("setConnectionStatus", () => {
    it("updates connection status", () => {
      useChatStore.getState().setConnectionStatus("connected");
      expect(useChatStore.getState().connectionStatus).toBe("connected");
    });

    it("handles connecting status", () => {
      useChatStore.getState().setConnectionStatus("connecting");
      expect(useChatStore.getState().connectionStatus).toBe("connecting");
    });
  });

  describe("setActiveSession", () => {
    it("sets activeSessionId", () => {
      useChatStore.getState().setActiveSession("session-1");
      expect(useChatStore.getState().activeSessionId).toBe("session-1");
    });

    it("clears activeSessionId with null", () => {
      useChatStore.getState().setActiveSession("session-1");
      useChatStore.getState().setActiveSession(null);
      expect(useChatStore.getState().activeSessionId).toBeNull();
    });

    it("sets isStreaming based on whether active session is streaming", () => {
      useChatStore.getState().setActiveSession("s1");
      useChatStore.getState().addMessage(
        makeMessage({ id: "x", status: "streaming" }),
        "s1",
      );
      useChatStore.getState().setActiveSession("s2");
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe("loadMessages", () => {
    it("stores messages for session and sets activeSessionId", () => {
      useChatStore.getState().addMessage(makeMessage({ id: "old" }), "s1");
      const history = [
        makeMessage({ id: "h1", role: "user", content: "question" }),
        makeMessage({ id: "h2", role: "assistant", content: "answer" }),
      ];
      useChatStore.getState().loadMessages("s2", history);
      expect(msgs("s2")).toEqual(history);
      expect(useChatStore.getState().activeSessionId).toBe("s2");
    });

    it("handles empty array", () => {
      useChatStore.getState().addMessage(makeMessage(), "s1");
      useChatStore.getState().loadMessages("s1", []);
      expect(msgs("s1")).toEqual([]);
    });

    it("stops streaming when loading history", () => {
      useChatStore.getState().setActiveSession("s1");
      useChatStore.getState().addMessage(makeMessage({ status: "streaming" }), "s1");
      expect(useChatStore.getState().isStreaming).toBe(true);
      useChatStore.getState().loadMessages("s1", [makeMessage({ status: "sent" })]);
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe("per-session streaming", () => {
    it("streaming in session A does not block session B", () => {
      useChatStore.getState().setActiveSession("A");
      useChatStore.getState().addMessage(
        makeMessage({ id: "a1", status: "streaming" }),
        "A",
      );
      expect(useChatStore.getState().isStreaming).toBe(true);

      useChatStore.getState().setActiveSession("B");
      expect(useChatStore.getState().isStreaming).toBe(false);
    });

    it("streamingSessionIds tracks multiple sessions", () => {
      useChatStore.getState().setActiveSession("A");
      useChatStore.getState().addMessage(
        makeMessage({ id: "a1", status: "streaming" }),
        "A",
      );
      useChatStore.getState().setActiveSession("B");
      useChatStore.getState().addMessage(
        makeMessage({ id: "b1", status: "streaming" }),
        "B",
      );
      expect(useChatStore.getState().streamingSessionIds).toContain("A");
      expect(useChatStore.getState().streamingSessionIds).toContain("B");
    });

    it("markComplete removes session from streaming", () => {
      useChatStore.getState().setActiveSession("A");
      useChatStore.getState().addMessage(
        makeMessage({ id: "a1", status: "streaming" }),
        "A",
      );
      expect(useChatStore.getState().streamingSessionIds).toContain("A");
      useChatStore.getState().markComplete("a1", undefined, "A");
      expect(useChatStore.getState().streamingSessionIds).not.toContain("A");
    });

    it("switching sessions preserves messages", () => {
      useChatStore.getState().addMessage(
        makeMessage({ id: "a1", content: "msg-a" }),
        "A",
      );
      useChatStore.getState().addMessage(
        makeMessage({ id: "b1", content: "msg-b" }),
        "B",
      );
      useChatStore.getState().setActiveSession("A");
      expect(msgs("A")).toHaveLength(1);
      expect(msgs("A")[0]!.content).toBe("msg-a");
      useChatStore.getState().setActiveSession("B");
      expect(msgs("B")).toHaveLength(1);
      expect(msgs("B")[0]!.content).toBe("msg-b");
    });
  });

  describe("reset", () => {
    it("restores initial state", () => {
      useChatStore.getState().addMessage(makeMessage(), "s1");
      useChatStore.getState().setInput("text");
      useChatStore.getState().setConnectionStatus("connected");
      useChatStore.getState().setActiveSession("session-1");
      useChatStore.getState().reset();

      const s = useChatStore.getState();
      expect(s.sessionMessages).toEqual({});
      expect(s.input).toBe("");
      expect(s.connectionStatus).toBe("disconnected");
      expect(s.isStreaming).toBe(false);
      expect(s.activeSessionId).toBeNull();
    });
  });
});
