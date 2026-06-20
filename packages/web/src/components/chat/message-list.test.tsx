import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "./message-list";
import type { Message } from "../../types/message";

const messages: Message[] = [
  { id: "m1", role: "user", content: "hello", timestamp: 1000, status: "sent" },
  { id: "m2", role: "assistant", content: "hi there", timestamp: 1001, status: "sent" },
];

describe("MessageList", () => {
  it("renders empty state when no messages", () => {
    const { container } = render(<MessageList messages={[]} />);
    expect(container.querySelector('[data-empty]')).toBeDefined();
  });

  it("renders messages", () => {
    render(<MessageList messages={messages} />);
    expect(screen.getByText("hello")).toBeDefined();
    expect(screen.getByText("hi there")).toBeDefined();
  });

  it("renders sentinel div for auto-scroll", () => {
    const { container } = render(<MessageList messages={messages} />);
    expect(container.querySelector('[data-scroll-sentinel="true"]')).toBeDefined();
  });
});
