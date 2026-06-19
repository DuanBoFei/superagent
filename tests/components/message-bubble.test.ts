import { describe, expect, it } from "vitest";
import { renderMessageBubble } from "../../packages/web/src/components/chat/message-bubble";
import type { Message } from "../../packages/web/src/types/message";

describe("message bubble", () => {
  it("renders user and assistant roles with status labels", () => {
    const user: Message = { id: "u1", role: "user", content: "hello", timestamp: 1, status: "sent" };
    const assistant: Message = { id: "a1", role: "assistant", content: "working", timestamp: 2, status: "streaming" };

    expect(renderMessageBubble(user)).toContain('data-role="user"');
    expect(renderMessageBubble(assistant)).toContain('data-status="streaming"');
  });

  it("sanitizes content and shows errors", () => {
    const message: Message = {
      id: "a1",
      role: "assistant",
      content: '<script>alert(1)</script><p>safe</p>',
      timestamp: 1,
      status: "error",
      error: "failed",
    };

    const html = renderMessageBubble(message);

    expect(html).not.toContain("script");
    expect(html).toContain("<p>safe</p>");
    expect(html).toContain("failed");
  });
});
