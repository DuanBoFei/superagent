import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChatStore, createQueueProcessor } from "../../packages/web/src/store/chat";
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

  it("limits pending messages to five and processes FIFO", () => {
    for (let index = 0; index < 5; index++) {
      expect(store.enqueueMessage(`msg_${index}`)).toBe(true);
    }

    expect(store.enqueueMessage("msg_5")).toBe(false);
    expect(store.getState().pendingQueue).toEqual(["msg_0", "msg_1", "msg_2", "msg_3", "msg_4"]);
    expect(store.processNextMessage()).toBe("msg_0");
    store.dequeueMessage("msg_0");
    expect(store.getState().pendingQueue).toEqual(["msg_1", "msg_2", "msg_3", "msg_4"]);
  });

  it("sends queued messages in order and advances after completion", () => {
    const send = vi.fn();
    const processor = createQueueProcessor(store, send);

    store.addMessage({ id: "msg_1", role: "user", content: "one", timestamp: 1, status: "pending" });
    store.addMessage({ id: "msg_2", role: "user", content: "two", timestamp: 2, status: "pending" });
    store.enqueueMessage("msg_1");
    store.enqueueMessage("msg_2");

    expect(processor.process()).toBe("msg_1");
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ id: "msg_1", status: "sending" }));
    expect(store.getState().messages[0]?.status).toBe("sending");

    expect(processor.complete("msg_1")).toBe("msg_2");
    expect(store.getState().pendingQueue).toEqual(["msg_2"]);
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ id: "msg_2", status: "sending" }));
  });
});
