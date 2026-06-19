import { beforeEach, describe, expect, it } from "vitest";
import { createChatStore } from "../../packages/web/src/store/chat";
import type { Message } from "../../packages/web/src/types/message";

describe("chat store", () => {
  let store: ReturnType<typeof createChatStore>;

  beforeEach(() => {
    store = createChatStore("session_1");
  });

  it("adds and updates messages", () => {
    const message: Message = {
      id: "msg_1",
      role: "user",
      content: "hello",
      timestamp: 1,
      status: "pending",
    };

    store.addMessage(message);
    store.updateMessage("msg_1", { status: "sending" });

    expect(store.getState().messages).toEqual([{ ...message, status: "sending" }]);
  });

  it("appends tokens and marks completion", () => {
    store.addMessage({ id: "msg_1", role: "assistant", content: "", timestamp: 1, status: "streaming" });
    store.appendToken("msg_1", "he");
    store.appendToken("msg_1", "llo");
    store.markComplete("msg_1", { inputTokens: 2, outputTokens: 1, durationMs: 10 });

    const [message] = store.getState().messages;
    expect(message?.content).toBe("hello");
    expect(message?.status).toBe("sent");
    expect(store.getState().streamingMessageId).toBeUndefined();
  });

  it("marks errors", () => {
    store.addMessage({ id: "msg_1", role: "assistant", content: "", timestamp: 1, status: "streaming" });
    store.markError("msg_1", "failed");

    expect(store.getState().messages[0]).toMatchObject({ status: "error", error: "failed" });
  });
});
