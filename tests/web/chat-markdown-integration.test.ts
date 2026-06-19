import { describe, expect, it } from "vitest";
import { renderMessageBubble } from "../../packages/web/src/components/chat/message-bubble";
import { createChatStore } from "../../packages/web/src/store/chat";
import type { Message } from "../../packages/web/src/types/message";

describe("chat markdown integration", () => {
  it("updates assistant AST and partial structure while streaming tokens", () => {
    const store = createChatStore("session_1");
    store.addMessage(createAssistantMessage({ id: "m1", content: "", status: "streaming" }));

    store.appendToken("m1", "## Title\n\n");
    store.appendToken("m1", "```ts\nconst answer = 42;");

    const message = store.getState().messages[0];
    expect(message.content).toBe("## Title\n\n```ts\nconst answer = 42;");
    expect(message.partialStructure).toBe("inCodeBlock");
    expect(message.ast).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "heading", depth: 2 }),
        expect.objectContaining({ type: "codeBlock", lang: "ts" }),
      ]),
    );
  });

  it("finalizes assistant AST when streaming completes", () => {
    const store = createChatStore("session_1");
    store.addMessage(createAssistantMessage({ id: "m1", content: "", status: "streaming" }));

    store.appendToken("m1", "- first\n- second");
    store.markComplete("m1");

    const message = store.getState().messages[0];
    expect(message.status).toBe("sent");
    expect(message.partialStructure).toBe("none");
    expect(message.ast).toEqual([expect.objectContaining({ type: "list" })]);
  });

  it("renders assistant messages from markdown AST", () => {
    const store = createChatStore("session_1");
    store.addMessage(createAssistantMessage({ id: "m1", content: "", status: "streaming" }));
    store.appendToken("m1", "## Title\n\nUse `pnpm test`.");

    const html = renderMessageBubble(store.getState().messages[0]);

    expect(html).toContain('<h2 class="markdown-heading markdown-heading-2">Title</h2>');
    expect(html).toContain('<code class="markdown-inline-code">pnpm test</code>');
  });

  it("continues to sanitize user messages as plain HTML", () => {
    const html = renderMessageBubble({
      id: "u1",
      role: "user",
      content: "Text <script>alert(1)</script> `not markdown`",
      timestamp: 1,
      status: "sent",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("`not markdown`");
  });
});

function createAssistantMessage(overrides: Partial<Message>): Message {
  return {
    id: "message_1",
    role: "assistant",
    content: "",
    timestamp: 1,
    status: "streaming",
    ...overrides,
  };
}
