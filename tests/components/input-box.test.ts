import { describe, expect, it, vi } from "vitest";
import { createInputBoxController, renderInputBox } from "../../packages/web/src/components/chat/input-box";

describe("input box", () => {
  it("submits enter, keeps shift-enter, and clears escape", () => {
    const send = vi.fn();
    const input = createInputBoxController({ onSend: send });

    input.setValue("hello");
    expect(input.handleKeyDown({ key: "Enter", shiftKey: true })).toBe("newline");
    expect(input.handleKeyDown({ key: "Enter", shiftKey: false })).toBe("sent");
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ content: "hello" }));
    expect(input.getValue()).toBe("");

    input.setValue("draft");
    expect(input.handleKeyDown({ key: "Escape", shiftKey: false })).toBe("cleared");
    expect(input.getValue()).toBe("");
  });

  it("preserves pasted newlines and blocks text over limit", () => {
    const send = vi.fn();
    const input = createInputBoxController({ onSend: send, limit: 10 });

    input.paste("line1\nline2");
    expect(input.getValue()).toBe("line1\nline2");
    expect(input.isOverLimit()).toBe(true);
    expect(input.handleKeyDown({ key: "Enter", shiftKey: false })).toBe("blocked");
    expect(send).not.toHaveBeenCalled();
  });

  it("renders textarea, character warning, and disabled send state", () => {
    const html = renderInputBox({ value: "123456", limit: 5, connected: true });

    expect(html).toContain("textarea");
    expect(html).toContain("data-over-limit=\"true\"");
    expect(html).toContain("6 / 5");
    expect(html).toContain("disabled");
  });
});
