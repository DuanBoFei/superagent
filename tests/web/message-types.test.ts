import { describe, expect, it } from "vitest";
import type {
  ClientMessageEvent,
  Message,
  MessageCompleteEvent,
  MessageErrorEvent,
  MessageRole,
  MessageStatus,
  StreamTokenEvent,
} from "../../packages/web/src/types/message";

describe("web message type contracts", () => {
  it("accepts user and assistant messages with lifecycle statuses", () => {
    const role: MessageRole = "assistant";
    const status: MessageStatus = "streaming";
    const message: Message = {
      id: "msg_1",
      role,
      content: "hello",
      timestamp: 1_718_000_000_000,
      status,
    };

    expect(message).toEqual({
      id: "msg_1",
      role: "assistant",
      content: "hello",
      timestamp: 1_718_000_000_000,
      status: "streaming",
    });
  });

  it("types the socket message flow payloads", () => {
    const clientMessage: ClientMessageEvent = {
      messageId: "msg_1",
      sessionId: "session_1",
      content: "run tests",
      timestamp: 1_718_000_000_000,
    };
    const streamToken: StreamTokenEvent = {
      messageId: clientMessage.messageId,
      sessionId: clientMessage.sessionId,
      token: "ok",
    };
    const complete: MessageCompleteEvent = {
      messageId: clientMessage.messageId,
      sessionId: clientMessage.sessionId,
      stats: { inputTokens: 10, outputTokens: 2, durationMs: 50 },
    };
    const error: MessageErrorEvent = {
      messageId: clientMessage.messageId,
      sessionId: clientMessage.sessionId,
      code: "RUNTIME_ERROR",
      message: "runtime failed",
      retryable: true,
    };

    expect(streamToken.token).toBe("ok");
    expect(complete.stats?.outputTokens).toBe(2);
    expect(error.retryable).toBe(true);
  });
});
