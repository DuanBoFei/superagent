import { describe, expect, it, vi } from "vitest";
import { RuntimeBridge } from "../../src/server/runtime-bridge";
import type { ClientMessageEvent } from "../../packages/web/src/types/message";
import type { TurnEvent } from "../../src/runtime/types";

function makeHandle(startTurn: () => AsyncGenerator<TurnEvent>) {
  return {
    startTurn: vi.fn(startTurn),
    loadHistory: vi.fn(),
  };
}

describe("RuntimeBridge", () => {
  it("maps runtime turn events to socket runtime events", async () => {
    async function* startTurn(): AsyncGenerator<TurnEvent> {
      yield { type: "text", content: "hello" };
      yield { type: "turn_end", summary: { turnNumber: 1, totalTokens: 3, totalCost: 0, reason: "completed" } };
    }

    const handle = makeHandle(startTurn);
    const bridge = new RuntimeBridge(() => handle);
    const message: ClientMessageEvent = { messageId: "msg_1", sessionId: "session_1", content: "go", timestamp: 1 };
    const events = [];

    for await (const event of bridge.routeToRuntime(message)) {
      events.push(event);
    }

    expect(handle.startTurn).toHaveBeenCalledWith("go");
    expect(handle.loadHistory).toHaveBeenCalledWith("session_1");
    expect(events).toEqual([
      { type: "token", token: "hello" },
      { type: "complete", stats: { inputTokens: 3, outputTokens: 0, durationMs: 0 } },
    ]);
  });

  it("reuses existing handle for same sessionId", async () => {
    async function* startTurn(): AsyncGenerator<TurnEvent> {
      yield { type: "text", content: "reply" };
      yield { type: "turn_end", summary: { turnNumber: 1, totalTokens: 1, totalCost: 0, reason: "completed" } };
    }

    let factoryCalls = 0;
    const bridge = new RuntimeBridge(() => {
      factoryCalls++;
      return makeHandle(startTurn);
    });

    const msg1: ClientMessageEvent = { messageId: "m1", sessionId: "s1", content: "hi", timestamp: 1 };
    const msg2: ClientMessageEvent = { messageId: "m2", sessionId: "s1", content: "again", timestamp: 2 };

    await Array.fromAsync(bridge.routeToRuntime(msg1));
    await Array.fromAsync(bridge.routeToRuntime(msg2));

    expect(factoryCalls).toBe(1);
  });

  it("creates separate handles for different sessionIds", async () => {
    async function* startTurn(): AsyncGenerator<TurnEvent> {
      yield { type: "text", content: "ok" };
      yield { type: "turn_end", summary: { turnNumber: 1, totalTokens: 1, totalCost: 0, reason: "completed" } };
    }

    let factoryCalls = 0;
    const bridge = new RuntimeBridge(() => {
      factoryCalls++;
      return makeHandle(startTurn);
    });

    const msgA: ClientMessageEvent = { messageId: "ma", sessionId: "session-A", content: "a", timestamp: 1 };
    const msgB: ClientMessageEvent = { messageId: "mb", sessionId: "session-B", content: "b", timestamp: 2 };

    await Array.fromAsync(bridge.routeToRuntime(msgA));
    await Array.fromAsync(bridge.routeToRuntime(msgB));

    expect(factoryCalls).toBe(2);
    expect(bridge.getHandleCount()).toBe(2);
  });

  it("closeSession removes handle from map", () => {
    const bridge = new RuntimeBridge(() => makeHandle(async function* () {
      yield { type: "text", content: "x" };
      yield { type: "turn_end", summary: { turnNumber: 1, totalTokens: 0, totalCost: 0, reason: "completed" } };
    }));

    // Trigger handle creation by routing a message
    const msg: ClientMessageEvent = { messageId: "m1", sessionId: "s1", content: "hi", timestamp: 1 };
    // Use Array.fromAsync to consume the generator
    const iter = bridge.routeToRuntime(msg);
    // We need to consume at least partially to create the entry, but closeSession should work
    // even if the handle exists. Let's just trigger creation and immediately check.
    // The entry is created synchronously in routeToRuntime before any yielding.
    iter.next(); // Start the generator to create the entry
    expect(bridge.getHandleCount()).toBe(1);

    bridge.closeSession("s1");
    expect(bridge.getHandleCount()).toBe(0);
  });

  it("isStreaming reflects active turn state", async () => {
    let streamStarted = false;
    async function* startTurn(): AsyncGenerator<TurnEvent> {
      streamStarted = true;
      yield { type: "text", content: "streaming" };
      yield { type: "turn_end", summary: { turnNumber: 1, totalTokens: 1, totalCost: 0, reason: "completed" } };
    }

    const bridge = new RuntimeBridge(() => makeHandle(startTurn));
    const msg: ClientMessageEvent = { messageId: "m1", sessionId: "s1", content: "hi", timestamp: 1 };

    const iter = bridge.routeToRuntime(msg);
    // Pull first event to enter the streaming state
    const first = await iter.next();

    expect(streamStarted).toBe(true);
    expect(first.value).toEqual({ type: "token", token: "streaming" });
    expect(bridge.isStreaming("s1")).toBe(true);
    expect(bridge.isStreaming("unknown")).toBe(false);

    // Consume the rest to exit streaming
    await Array.fromAsync(iter);
    expect(bridge.isStreaming("s1")).toBe(false);
  });

  it("loadHistory is called with sessionId when creating new handle", async () => {
    async function* startTurn(): AsyncGenerator<TurnEvent> {
      yield { type: "turn_end", summary: { turnNumber: 1, totalTokens: 0, totalCost: 0, reason: "completed" } };
    }

    const handle = makeHandle(startTurn);
    const bridge = new RuntimeBridge(() => handle);
    const msg: ClientMessageEvent = { messageId: "m1", sessionId: "s1", content: "go", timestamp: 1 };

    await Array.fromAsync(bridge.routeToRuntime(msg));

    expect(handle.loadHistory).toHaveBeenCalledWith("s1");
  });
});
