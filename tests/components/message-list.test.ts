import { describe, expect, it } from "vitest";
import { createMessageListController, renderMessageList } from "../../packages/web/src/components/chat/message-list";
import type { Message } from "../../packages/web/src/types/message";

function message(index: number): Message {
  return { id: `m${index}`, role: index % 2 === 0 ? "assistant" : "user", content: `message ${index}`, timestamp: index, status: "sent" };
}

describe("message list", () => {
  it("renders only the virtualized message window", () => {
    const messages = Array.from({ length: 500 }, (_, index) => message(index));
    const html = renderMessageList({ messages, viewportHeight: 480, scrollTop: 0, itemHeight: 24 });

    expect(html).toContain('data-total="500"');
    expect(html).toContain('data-rendered="22"');
    expect(html).toContain("message 0");
    expect(html).not.toContain("message 499");
  });

  it("tracks bottom state and latest button visibility", () => {
    const list = createMessageListController({ viewportHeight: 100, bottomThreshold: 16 });

    list.setContentHeight(500);
    list.setScrollTop(400);
    expect(list.shouldAutoScroll()).toBe(true);
    expect(list.shouldShowJumpToLatest()).toBe(false);

    list.setScrollTop(200);
    expect(list.shouldAutoScroll()).toBe(false);
    expect(list.shouldShowJumpToLatest()).toBe(true);
  });
});
