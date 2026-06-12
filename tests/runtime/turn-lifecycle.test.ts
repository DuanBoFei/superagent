import { describe, expect, it, vi } from "vitest";
import { createEmitter } from "../../src/runtime/turn-lifecycle";
import { TurnEvent } from "../../src/runtime/types";

describe("Turn lifecycle emitter", () => {
  it("emit calls registered listener", () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    emitter.on("text", handler);

    const event: TurnEvent = { type: "text", content: "hello" };
    emitter.emit(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("emit only calls matching type listeners", () => {
    const emitter = createEmitter();
    const textHandler = vi.fn();
    const toolHandler = vi.fn();
    emitter.on("text", textHandler);
    emitter.on("tool_call", toolHandler);

    emitter.emit({ type: "text", content: "hello" });

    expect(textHandler).toHaveBeenCalledTimes(1);
    expect(toolHandler).not.toHaveBeenCalled();
  });

  it("emit calls multiple listeners for same type", () => {
    const emitter = createEmitter();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    emitter.on("text", handler1);
    emitter.on("text", handler2);

    emitter.emit({ type: "text", content: "hello" });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("off removes a listener", () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    emitter.on("text", handler);
    emitter.off("text", handler);

    emitter.emit({ type: "text", content: "hello" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("emit with no registered listeners does not throw", () => {
    const emitter = createEmitter();
    expect(() =>
      emitter.emit({ type: "text", content: "hello" }),
    ).not.toThrow();
  });

  it("off on non-existent type does not throw", () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    expect(() => emitter.off("text", handler)).not.toThrow();
  });

  it("emit lifecycle events (session:start, turn:start, tool:start, tool:end, turn:end)", () => {
    const emitter = createEmitter();
    const events: TurnEvent[] = [];
    emitter.on("*", (e) => events.push(e));

    emitter.emit({
      type: "tool_call",
      name: "Read",
      args: { file_path: "/f.ts" },
    });
    emitter.emit({
      type: "tool_result",
      name: "Read",
      success: true,
      summary: "ok",
    });
    emitter.emit({
      type: "turn_end",
      summary: {
        turnNumber: 1,
        totalTokens: 100,
        totalCost: 0.01,
        reason: "completed",
      },
    });

    expect(events.length).toBe(3);
  });
});
