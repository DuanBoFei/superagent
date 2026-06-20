import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "./message-bubble";
import type { Message } from "../../types/message";

const userMsg: Message = {
  id: "m1",
  role: "user",
  content: "hello",
  timestamp: 1000,
  status: "sent",
};

const assistantMsg: Message = {
  id: "m2",
  role: "assistant",
  content: "## Code\n\n```ts\nconst x = 1;\n```",
  timestamp: 1000,
  status: "sent",
};

describe("MessageBubble", () => {
  it("renders user message content", () => {
    render(<MessageBubble message={userMsg} />);
    expect(screen.getByText("hello")).toBeDefined();
  });

  it("renders assistant message with markdown", () => {
    render(<MessageBubble message={assistantMsg} />);
    expect(screen.getByText("Code")).toBeDefined();
  });

  it("renders user message right-aligned", () => {
    const { container } = render(<MessageBubble message={userMsg} />);
    const bubble = container.firstElementChild as HTMLElement;
    expect(bubble.className).toContain("user");
  });

  it("renders assistant message left-aligned", () => {
    const { container } = render(<MessageBubble message={assistantMsg} />);
    const bubble = container.firstElementChild as HTMLElement;
    expect(bubble.className).toContain("assistant");
  });

  it("shows streaming cursor for streaming messages", () => {
    const streaming: Message = { ...assistantMsg, status: "streaming" };
    const { container } = render(<MessageBubble message={streaming} />);
    expect(container.querySelector('[data-streaming]')).toBeDefined();
  });

  it("shows error state for error messages", () => {
    const error: Message = { ...assistantMsg, status: "error", error: "API Error" };
    render(<MessageBubble message={error} />);
    expect(screen.getByText("API Error")).toBeDefined();
  });
});
