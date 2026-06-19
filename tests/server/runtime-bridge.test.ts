import { describe, expect, it, vi } from "vitest";
import { RuntimeBridge } from "../../src/server/runtime-bridge";
import type { ClientMessageEvent } from "../../packages/web/src/types/message";
import type { TurnEvent } from "../../src/runtime/types";

describe("RuntimeBridge", () => {
  it("maps runtime turn events to socket runtime events", async () => {
    async function* startTurn(): AsyncGenerator<TurnEvent> {
      yield { type: "text", content: "hello" };
      yield { type: "turn_end", summary: { turnNumber: 1, totalTokens: 3, totalCost: 0, reason: "completed" } };
    }

    const runtime = { startTurn: vi.fn(startTurn) };
    const bridge = new RuntimeBridge(runtime);
    const message: ClientMessageEvent = { messageId: "msg_1", sessionId: "session_1", content: "go", timestamp: 1 };
    const events = [];

    for await (const event of bridge.routeToRuntime(message)) {
      events.push(event);
    }

    expect(runtime.startTurn).toHaveBeenCalledWith("go");
    expect(events).toEqual([
      { type: "token", token: "hello" },
      { type: "complete", stats: { inputTokens: 3, outputTokens: 0, durationMs: 0 } },
    ]);
  });

  it("marks active turns as aborted", () => {
    const runtime = { startTurn: vi.fn() };
    const bridge = new RuntimeBridge(runtime);

    bridge.abortTurn("msg_1");

    expect(bridge.isAborted("msg_1")).toBe(true);
  });
});
