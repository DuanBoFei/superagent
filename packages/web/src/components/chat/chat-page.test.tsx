import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPage } from "./chat-page";
import { useChatStore } from "../../store/chat";

// Controllable state for fake socket
const mockSocketState = { connected: true };
let socketHandlers: Record<string, (...args: any[]) => void> = {};

function makeFakeSocket() {
  socketHandlers = {};
  return {
    get connected() {
      return mockSocketState.connected;
    },
    on: vi.fn((event: string, fn: (...args: any[]) => void) => {
      socketHandlers[event] = fn;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
}

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => makeFakeSocket()),
}));

beforeEach(() => {
  mockSocketState.connected = true;
  socketHandlers = {};
  useChatStore.getState().reset();
  useChatStore.getState().setConnectionStatus("connected");
});

describe("ChatPage", () => {
  it("renders InputBox and empty MessageList", () => {
    render(<ChatPage />);
    expect(screen.getByPlaceholderText("Ask SuperAgent...")).toBeDefined();
  });

  it("adds user message on send", async () => {
    const user = userEvent.setup();
    render(<ChatPage />);

    await user.type(screen.getByPlaceholderText("Ask SuperAgent..."), "hello{Enter}");

    const msgs = useChatStore.getState().messages;
    expect(msgs.length).toBe(1);
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].content).toBe("hello");
  });

  it("does not add user message when input is empty", async () => {
    const user = userEvent.setup();
    render(<ChatPage />);

    await user.type(screen.getByPlaceholderText("Ask SuperAgent..."), "{Enter}");

    expect(useChatStore.getState().messages.length).toBe(0);
  });

  it("shows reconnection banner when socket is disconnected", () => {
    mockSocketState.connected = false;
    render(<ChatPage />);
    expect(screen.getByText(/disconnected from server/i)).toBeDefined();
  });

  it("does not show reconnection banner when socket is connected", () => {
    mockSocketState.connected = true;
    render(<ChatPage />);
    expect(screen.queryByText(/disconnected from server/i)).toBeNull();
  });
});

describe("ChatPage streaming integration", () => {
  it("appendToken creates streaming assistant message", () => {
    useChatStore.getState().appendToken("assist-1", "Hello");
    useChatStore.getState().appendToken("assist-1", " world");

    const msgs = useChatStore.getState().messages;
    expect(msgs.length).toBe(1);
    expect(msgs[0].id).toBe("assist-1");
    expect(msgs[0].role).toBe("assistant");
    expect(msgs[0].content).toBe("Hello world");
    expect(msgs[0].status).toBe("streaming");
    expect(useChatStore.getState().isStreaming).toBe(true);
  });

  it("markComplete finalizes streaming message", () => {
    useChatStore.getState().appendToken("assist-1", "Hello");
    useChatStore.getState().markComplete("assist-1", { inputTokens: 100, outputTokens: 50, durationMs: 2000 });

    const msgs = useChatStore.getState().messages;
    expect(msgs[0].status).toBe("sent");
    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it("markError sets message to error state", () => {
    useChatStore.getState().appendToken("assist-1", "partial");
    useChatStore.getState().markError("assist-1", "timeout");

    const msgs = useChatStore.getState().messages;
    expect(msgs[0].status).toBe("error");
    expect(msgs[0].error).toBe("timeout");
    expect(useChatStore.getState().isStreaming).toBe(false);
  });

  it("appendToken for unknown id creates placeholder", () => {
    useChatStore.getState().appendToken("new-msg", "first token");

    const msgs = useChatStore.getState().messages;
    expect(msgs.length).toBe(1);
    expect(msgs[0].id).toBe("new-msg");
    expect(msgs[0].role).toBe("assistant");
    expect(msgs[0].content).toBe("first token");
    expect(msgs[0].status).toBe("streaming");
  });

  it("full streaming lifecycle: append → complete → verify final state", () => {
    useChatStore.getState().appendToken("msg-1", "Hello");
    useChatStore.getState().appendToken("msg-1", " world");

    let msgs = useChatStore.getState().messages;
    expect(msgs[0].status).toBe("streaming");
    expect(useChatStore.getState().isStreaming).toBe(true);

    useChatStore.getState().markComplete("msg-1", { inputTokens: 50, outputTokens: 10, durationMs: 500 });

    msgs = useChatStore.getState().messages;
    expect(msgs[0].status).toBe("sent");
    expect(msgs[0].content).toBe("Hello world");
    expect(useChatStore.getState().isStreaming).toBe(false);
  });
});
