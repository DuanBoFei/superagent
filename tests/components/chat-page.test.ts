import { describe, expect, it } from "vitest";
import { createChatPageController, renderChatPage } from "../../packages/web/src/components/chat/chat-page";
import { createChatStore } from "../../packages/web/src/store/chat";

describe("chat page", () => {
  it("assembles message list and input box", () => {
    const store = createChatStore("session_1");
    store.addMessage({ id: "m1", role: "assistant", content: "ready", timestamp: 1, status: "sent" });

    const html = renderChatPage({ store, inputValue: "hello", viewportHeight: 480, scrollTop: 0 });

    expect(html).toContain('data-session-id="session_1"');
    expect(html).toContain("ready");
    expect(html).toContain("textarea");
  });

  it("adds a user message and queues it for sending", () => {
    const store = createChatStore("session_1");
    const page = createChatPageController({ store, now: () => 10, createId: () => "msg_1" });

    expect(page.sendMessage("hello")).toBe(true);
    expect(store.getState().messages[0]).toEqual({ id: "msg_1", role: "user", content: "hello", timestamp: 10, status: "pending" });
    expect(store.getState().pendingQueue).toEqual(["msg_1"]);
  });
});
