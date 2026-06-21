import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputBox } from "./input-box";
import { useChatStore } from "../../store/chat";

beforeEach(() => {
  useChatStore.getState().reset();
  useChatStore.getState().setConnectionStatus("connected");
});

describe("InputBox", () => {
  it("renders textarea and send button", () => {
    render(<InputBox onSend={() => {}} />);
    const textarea = screen.getByPlaceholderText("Ask SuperAgent...");
    expect(textarea).toBeDefined();
    const btn = screen.getByRole("button", { name: "Send" });
    expect(btn).toBeDefined();
  });

  it("calls onSend on Enter", async () => {
    const user = userEvent.setup();
    let sent = "";
    render(<InputBox onSend={(c) => { sent = c; }} />);
    await user.type(screen.getByPlaceholderText("Ask SuperAgent..."), "hello{Enter}");
    expect(sent).toBe("hello");
  });

  it("clears input after send", async () => {
    const user = userEvent.setup();
    render(<InputBox onSend={() => {}} />);
    await user.type(screen.getByPlaceholderText("Ask SuperAgent..."), "test{Enter}");
    expect(useChatStore.getState().input).toBe("");
  });

  it("blocks empty send", async () => {
    const user = userEvent.setup();
    let sent = "";
    render(<InputBox onSend={(c) => { sent = c; }} />);
    await user.type(screen.getByPlaceholderText("Ask SuperAgent..."), "{Enter}");
    expect(sent).toBe("");
  });

  it("blocks whitespace-only send", async () => {
    const user = userEvent.setup();
    let sent = "";
    render(<InputBox onSend={(c) => { sent = c; }} />);
    await user.type(screen.getByPlaceholderText("Ask SuperAgent..."), "   {Enter}");
    expect(sent).toBe("");
  });

  it("Shift+Enter inserts newline", async () => {
    const user = userEvent.setup();
    let sent = "";
    render(<InputBox onSend={(c) => { sent = c; }} />);
    const textarea = screen.getByPlaceholderText("Ask SuperAgent...");
    await user.type(textarea, "line1{Shift>}{Enter}{/Shift}line2");
    // Shift+Enter should not send
    expect(sent).toBe("");
  });

  it("send button click sends message", async () => {
    const user = userEvent.setup();
    let sent = "";
    render(<InputBox onSend={(c) => { sent = c; }} />);
    await user.type(screen.getByPlaceholderText("Ask SuperAgent..."), "hello");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(sent).toBe("hello");
  });

  it("disables button while streaming", () => {
    useChatStore.getState().addMessage({
      id: "s1", role: "assistant", content: "", timestamp: Date.now(), status: "streaming",
    });
    render(<InputBox onSend={() => {}} />);
    const btn = screen.getByRole("button", { name: "Send" });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("disables button when disconnected", () => {
    useChatStore.getState().setConnectionStatus("disconnected");
    render(<InputBox onSend={() => {}} />);
    const btn = screen.getByRole("button", { name: "Send" });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });
});
