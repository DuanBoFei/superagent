import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPage } from "./chat-page";
import { useChatStore } from "../../store/chat";

beforeEach(() => {
  useChatStore.getState().reset();
  useChatStore.getState().setConnectionStatus("connected");
});

describe("ChatPage", () => {
  it("renders InputBox and empty MessageList", () => {
    render(<ChatPage onSend={() => {}} />);
    expect(screen.getByPlaceholderText("Ask SuperAgent...")).toBeDefined();
  });

  it("adds user message on send and calls onSend", async () => {
    const user = userEvent.setup();
    let content = "";
    render(<ChatPage onSend={(c) => { content = c; }} />);
    await user.type(screen.getByPlaceholderText("Ask SuperAgent..."), "hello{Enter}");
    expect(content).toBe("hello");
    const msgs = useChatStore.getState().messages;
    expect(msgs.length).toBe(1);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toBe("hello");
  });

  it("does not add user message when send is blocked (empty)", async () => {
    const user = userEvent.setup();
    let called = false;
    render(<ChatPage onSend={() => { called = true; }} />);
    await user.type(screen.getByPlaceholderText("Ask SuperAgent..."), "{Enter}");
    expect(called).toBe(false);
    expect(useChatStore.getState().messages.length).toBe(0);
  });
});
