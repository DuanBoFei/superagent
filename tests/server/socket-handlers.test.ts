import { describe, expect, it, vi } from "vitest";
import { registerClientMessageHandler, type RuntimeEvent } from "../../src/server/socket-handlers";
import type { ClientMessageEvent } from "../../packages/web/src/types/message";

describe("socket handlers", () => {
  it("routes client messages and emits stream events", async () => {
    const emitted: Array<[string, unknown]> = [];
    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        yield { type: "token", token: "hi" };
        yield { type: "complete", stats: { inputTokens: 1, outputTokens: 1, durationMs: 5 } };
      }),
    };
    const socket = { emit: (event: string, payload: unknown) => emitted.push([event, payload]) };
    const handler = registerClientMessageHandler(runtime);
    const message: ClientMessageEvent = { messageId: "msg_1", sessionId: "session_1", content: "hello", timestamp: 1 };

    await handler(socket, message);

    expect(runtime.startTurn).toHaveBeenCalledWith(message);
    expect(emitted).toEqual([
      ["stream_token", { messageId: "msg_1", sessionId: "session_1", token: "hi" }],
      ["message_complete", { messageId: "msg_1", sessionId: "session_1", stats: { inputTokens: 1, outputTokens: 1, durationMs: 5 } }],
    ]);
  });
});
