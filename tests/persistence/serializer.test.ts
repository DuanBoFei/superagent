import { describe, expect, it } from "vitest";
import { serialize, deserialize, SessionCorruptedError } from "../../src/persistence/serializer";
import type { SessionState } from "../../src/runtime/types";
import { State } from "../../src/runtime/types";

function makeState(overrides?: Partial<SessionState>): SessionState {
  return {
    sessionId: "sess-abc",
    turnNumber: 3,
    messages: [
      { role: "user", content: "fix the bug" },
      { role: "assistant", content: "I'll help" },
    ],
    toolResults: [
      { name: "Read", success: true, output: "file contents" },
    ],
    state: State.IDLE,
    interruptFlag: false,
    startedAt: 1700000000000,
    ...overrides,
  };
}

describe("serializer", () => {
  it("round-trip: SessionState → JSON → SessionState", () => {
    const original = makeState();
    const json = serialize(original);
    const restored = deserialize(json);
    expect(restored).toEqual(original);
  });

  it("handles empty messages array", () => {
    const original = makeState({ messages: [] });
    const json = serialize(original);
    const restored = deserialize(json);
    expect(restored.messages).toHaveLength(0);
    expect(restored).toEqual(original);
  });

  it("handles empty toolResults array", () => {
    const original = makeState({ toolResults: [] });
    const json = serialize(original);
    const restored = deserialize(json);
    expect(restored.toolResults).toHaveLength(0);
  });

  it("handles session with 100 messages", () => {
    const messages = Array.from({ length: 100 }, (_, i) => ({
      role: "assistant" as const,
      content: `message ${i}`,
    }));
    const original = makeState({ messages });
    const json = serialize(original);
    const restored = deserialize(json);
    expect(restored.messages).toHaveLength(100);
    expect(restored.messages[99]!.content).toBe("message 99");
  });

  it("throws SessionCorruptedError on invalid JSON", () => {
    expect(() => deserialize("not json {")).toThrow(SessionCorruptedError);
  });

  it("throws SessionCorruptedError on empty string", () => {
    expect(() => deserialize("")).toThrow(SessionCorruptedError);
  });

  it("preserves turnNumber and startedAt as numbers", () => {
    const original = makeState({ turnNumber: 7, startedAt: 1712345678000 });
    const json = serialize(original);
    const restored = deserialize(json);
    expect(restored.turnNumber).toBe(7);
    expect(restored.startedAt).toBe(1712345678000);
  });

  it("preserves interruptFlag", () => {
    const original = makeState({ interruptFlag: true });
    const restored = deserialize(serialize(original));
    expect(restored.interruptFlag).toBe(true);
  });
});
