import { describe, expect, it, vi } from "vitest";
import { RuntimeBridge } from "../../src/server/runtime-bridge";
import { registerClientMessageHandler } from "../../src/server/socket-handlers";
import { createChatStore } from "../../packages/web/src/store/chat";
import type { ClientMessageEvent, MessageCompleteEvent, StreamTokenEvent } from "../../packages/web/src/types/message";
import type { TurnEvent } from "../../src/runtime/types";

describe("web message flow", () => {
  it("routes a client message through runtime streaming into chat state", async () => {
    async function* startTurn(): AsyncGenerator<TurnEvent> {
      yield { type: "text", content: "hel" };
      yield { type: "text", content: "lo" };
      yield { type: "turn_end", summary: { turnNumber: 1, totalTokens: 2, totalCost: 0, reason: "completed" } };
    }

    const store = createChatStore("session_1");
    const bridge = new RuntimeBridge({ startTurn: vi.fn(startTurn) });
    const handler = registerClientMessageHandler({ startTurn: (message) => bridge.routeToRuntime(message) });
    const emitted: Array<{ event: string; payload: unknown }> = [];
    const socket = { emit: (event: string, payload: unknown) => emitted.push({ event, payload }) };
    const message: ClientMessageEvent = { messageId: "msg_1", sessionId: "session_1", content: "go", timestamp: 1 };

    store.addMessage({ id: "assistant_1", role: "assistant", content: "", timestamp: 2, status: "streaming" });
    await handler(socket, message);

    for (const item of emitted) {
      if (item.event === "stream_token") {
        store.appendToken("assistant_1", (item.payload as StreamTokenEvent).token);
      }
      if (item.event === "message_complete") {
        store.markComplete("assistant_1", (item.payload as MessageCompleteEvent).stats);
      }
    }

    expect(emitted.map((item) => item.event)).toEqual(["stream_token", "stream_token", "message_complete"]);
    expect(store.getState().messages[0].content).toBe("hello");
    expect(store.getState().messages[0].status).toBe("sent");
  });
});
