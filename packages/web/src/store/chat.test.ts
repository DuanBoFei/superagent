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

describe("ChatStore", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  describe("initial state", () => {
    it("has empty messages", () => {
      expect(useChatStore.getState().messages).toEqual([]);
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

    it("has null sessionId", () => {
      expect(useChatStore.getState().sessionId).toBeNull();
    });
  });

  describe("addMessage", () => {
    it("appends a message", () => {
      const msg = makeMessage();
      useChatStore.getState().addMessage(msg);
      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0]).toEqual(msg);
    });

    it("sets isStreaming when message status is streaming", () => {
      const msg = makeMessage({ status: "streaming" });
      useChatStore.getState().addMessage(msg);
      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    it("preserves message order", () => {
      const first = makeMessage({ id: "1", content: "first" });
      const second = makeMessage({ id: "2", content: "second" });
      useChatStore.getState().addMessage(first);
      useChatStore.getState().addMessage(second);
      expect(useChatStore.getState().messages.map((m) => m.id)).toEqual([
        "1",
        "2",
      ]);
    });
  });

  describe("appendToken", () => {
    it("appends token to existing message content", () => {
      const msg = makeMessage({ id: "a1", content: "He", status: "streaming" });
      useChatStore.getState().addMessage(msg);
      useChatStore.getState().appendToken("a1", "llo");
      const updated = useChatStore.getState().messages[0];
      expect(updated?.content).toBe("Hello");
    });

    it("keeps status as streaming", () => {
      const msg = makeMessage({ id: "a1", content: "", status: "streaming" });
      useChatStore.getState().addMessage(msg);
      useChatStore.getState().appendToken("a1", "x");
      expect(useChatStore.getState().messages[0]?.status).toBe("streaming");
    });

    it("creates placeholder for unknown message id", () => {
      useChatStore.getState().appendToken("new-id", "hello");
      const messages = useChatStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0]?.id).toBe("new-id");
      expect(messages[0]?.content).toBe("hello");
      expect(messages[0]?.role).toBe("assistant");
    });

    it("sets isStreaming to true", () => {
      useChatStore.getState().appendToken("x", "t");
      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    it("multiple tokens accumulate", () => {
      useChatStore.getState().appendToken("m1", "a");
      useChatStore.getState().appendToken("m1", "b");
      useChatStore.getState().appendToken("m1", "c");
      expect(useChatStore.getState().messages[0]?.content).toBe("abc");
    });
  });

  describe("markComplete", () => {
    it("sets message status to sent", () => {
      const msg = makeMessage({ id: "x", status: "streaming" });
      useChatStore.getState().addMessage(msg);
      useChatStore.getState().markComplete("x");
      expect(useChatStore.getState().messages[0]?.status).toBe("sent");
    });

    it("sets isStreaming to false", () => {
      useChatStore.getState().addMessage(
        makeMessage({ id: "x", status: "streaming" }),
      );
      useChatStore.getState().markComplete("x");
      expect(useChatStore.getState().isStreaming).toBe(false);
    });

    it("does not affect other messages", () => {
      useChatStore.getState().addMessage(makeMessage({ id: "a", content: "a" }));
      useChatStore.getState().addMessage(makeMessage({ id: "b", content: "b" }));
      useChatStore.getState().markComplete("a");
      expect(useChatStore.getState().messages[1]?.content).toBe("b");
    });
  });

  describe("markError", () => {
    it("sets message status to error with message", () => {
      const msg = makeMessage({ id: "e1", status: "streaming" });
      useChatStore.getState().addMessage(msg);
      useChatStore.getState().markError("e1", "timeout");
      const updated = useChatStore.getState().messages[0];
      expect(updated?.status).toBe("error");
      expect(updated?.error).toBe("timeout");
    });

    it("sets isStreaming to false", () => {
      useChatStore.getState().addMessage(
        makeMessage({ id: "e1", status: "streaming" }),
      );
      useChatStore.getState().markError("e1", "err");
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

  describe("setSessionId", () => {
    it("sets sessionId", () => {
      useChatStore.getState().setSessionId("session-1");
      expect(useChatStore.getState().sessionId).toBe("session-1");
    });

    it("clears sessionId with null", () => {
      useChatStore.getState().setSessionId("session-1");
      useChatStore.getState().setSessionId(null);
      expect(useChatStore.getState().sessionId).toBeNull();
    });
  });

  describe("loadMessages", () => {
    it("replaces messages array", () => {
      useChatStore.getState().addMessage(makeMessage({ id: "old" }));
      const history = [
        makeMessage({ id: "h1", role: "user", content: "question" }),
        makeMessage({ id: "h2", role: "assistant", content: "answer" }),
      ];
      useChatStore.getState().loadMessages(history);
      expect(useChatStore.getState().messages).toEqual(history);
    });

    it("handles empty array", () => {
      useChatStore.getState().addMessage(makeMessage());
      useChatStore.getState().loadMessages([]);
      expect(useChatStore.getState().messages).toEqual([]);
    });

    it("stops streaming when loading history", () => {
      useChatStore.getState().addMessage(makeMessage({ status: "streaming" }));
      useChatStore.getState().loadMessages([makeMessage({ status: "sent" })]);
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe("reset", () => {
    it("restores initial state", () => {
      useChatStore.getState().addMessage(makeMessage());
      useChatStore.getState().setInput("text");
      useChatStore.getState().setConnectionStatus("connected");
      useChatStore.getState().setSessionId("session-1");
      useChatStore.getState().reset();

      const s = useChatStore.getState();
      expect(s.messages).toEqual([]);
      expect(s.input).toBe("");
      expect(s.connectionStatus).toBe("disconnected");
      expect(s.isStreaming).toBe(false);
      expect(s.sessionId).toBeNull();
    });
  });
});
