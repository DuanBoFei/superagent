import { describe, expect, it } from "vitest";
import { renderMessageBubble } from "../../../packages/web/src/components/chat/message-bubble";
import { renderMessageList } from "../../../packages/web/src/components/chat/message-list";
import { createChatStore } from "../../../packages/web/src/store/chat";
import type { Message } from "../../../packages/web/src/types/message";

function assistant(id: string, content = "", status: Message["status"] = "streaming"): Message {
  return { id, role: "assistant", content, timestamp: 1, status };
}

describe("markdown end-to-end acceptance", () => {
  it("streams a realistic multi-turn assistant response with code blocks and lists", () => {
    const store = createChatStore("acceptance_1");
    store.addMessage(assistant("m1"));

    // Simulate a realistic streaming sequence
    const tokens = [
      "## Summary\n\n",
      "The fix involves three changes:\n\n",
      "1. Update the parser\n",
      "2. Add validation\n",
      "3. Run tests\n\n",
      "```ts\n",
      "function parse(input: string) {\n",
      "  return JSON.parse(input);\n",
      "}\n",
      "```\n\n",
      "> **Note**: Always validate before parsing.\n\n",
      "| Step | Status |\n",
      "| ---- | ------ |\n",
      "| 1    | done   |\n",
      "| 2    | todo   |\n",
    ];

    for (const token of tokens) {
      store.appendToken("m1", token);
    }
    store.markComplete("m1");

    const message = store.getState().messages[0];
    expect(message.status).toBe("sent");
    expect(message.partialStructure).toBe("none");
    expect(message.ast).toBeDefined();

    const html = renderMessageBubble(message);

    // Verify structural elements in final render
    expect(html).toContain('<h2 class="markdown-heading markdown-heading-2">Summary</h2>');
    expect(html).toContain('markdown-list markdown-list-ordered');
    expect(html).toContain('<figure class="markdown-code-block" data-language="ts">');
    expect(html).toContain('<span class="token keyword">function</span> parse');
    expect(html).toContain('<blockquote class="markdown-blockquote">');
    expect(html).toContain('<div class="markdown-table-wrapper"');
    expect(html).toContain("data-status=\"sent\"");
  });

  it("handles large code blocks with collapse metadata and copy data", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `console.log("line ${i + 1}");`);
    const source = lines.join("\n");
    const store = createChatStore("acceptance_2");
    store.addMessage(assistant("m2"));

    store.appendToken("m2", "```ts\n");
    for (const line of lines) {
      store.appendToken("m2", `${line}\n`);
    }
    store.appendToken("m2", "```");
    store.markComplete("m2");

    const html = renderMessageBubble(store.getState().messages[0]);

    // 50 lines > 30 → collapsed
    expect(html).toContain('data-collapsed="true"');
    expect(html).toContain("Expand 50 lines");
    // Only first 10 visible as code-line-content
    expect(html).not.toContain('<span class="markdown-code-line-content">console.log("line 50");</span>');
    // data-copy has full source
    expect(html).toContain("data-copy=");
  });

  it("escapes XSS in streaming assistant content", () => {
    const store = createChatStore("acceptance_3");
    store.addMessage(assistant("m3"));

    store.appendToken("m3", "Safe text and ");
    store.appendToken("m3", "<script>alert(1)</script>");
    store.appendToken("m3", " more safe text.");
    store.markComplete("m3");

    const html = renderMessageBubble(store.getState().messages[0]);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Safe text");
    expect(html).toContain("more safe text");
  });

  it("renders virtualized message list with mixed user and assistant messages", () => {
    const store = createChatStore("acceptance_4");

    store.addMessage({ id: "u1", role: "user", content: "Fix the parser bug", timestamp: 1, status: "sent" });
    store.addMessage(assistant("a1"));
    store.appendToken("a1", "## Analysis\n\n");
    store.appendToken("a1", "The parser fails on empty input.");
    store.markComplete("a1");

    store.addMessage({ id: "u2", role: "user", content: "Add a test too", timestamp: 2, status: "sent" });
    store.addMessage(assistant("a2"));
    store.appendToken("a2", "```ts\n");
    store.appendToken("a2", "expect(parse(\"\")).toEqual(null);\n");
    store.appendToken("a2", "```");
    store.markComplete("a2");

    const html = renderMessageList({
      messages: store.getState().messages,
      viewportHeight: 600,
      scrollTop: 0,
    });

    expect(html).toContain('data-total="4"');
    expect(html).toContain("data-role=\"user\"");
    expect(html).toContain("data-role=\"assistant\"");
    expect(html).toContain('<h2 class="markdown-heading markdown-heading-2">Analysis</h2>');
    expect(html).toContain('<figure class="markdown-code-block" data-language="ts">');
  });

  it("retains partialStructure during streaming and clears on finish", () => {
    const store = createChatStore("acceptance_5");
    store.addMessage(assistant("m5"));

    store.appendToken("m5", "```bash\nnpm run test\n");
    expect(store.getState().messages[0].partialStructure).toBe("inCodeBlock");

    store.appendToken("m5", "```\n\nDone.");
    store.markComplete("m5");

    expect(store.getState().messages[0].partialStructure).toBe("none");
    expect(store.getState().messages[0].status).toBe("sent");
  });
});
