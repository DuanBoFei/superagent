import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../../src/persistence/memory-store";
import type { SessionState } from "../../src/runtime/types";
import { State } from "../../src/runtime/types";

function makeState(overrides?: Partial<SessionState>): SessionState {
  return {
    sessionId: "mem-test",
    turnNumber: 3,
    messages: [
      { role: "user", content: "fix the bug" },
      { role: "assistant", content: "on it" },
    ],
    toolResults: [],
    state: State.IDLE,
    interruptFlag: false,
    startedAt: 1700000000000,
    ...overrides,
  };
}

describe("memory-store", () => {
  it("save + load returns matching SessionState", () => {
    const store = createMemoryStore();
    const state = makeState();
    const result = store.save(state);
    expect(result.success).toBe(true);

    const loaded = store.load(state.sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe("mem-test");
    expect(loaded!.turnNumber).toBe(3);
    expect(loaded!.messages).toEqual(state.messages);
  });

  it("list with 3 sessions returns 3 summaries", () => {
    const store = createMemoryStore();
    store.save(makeState({ sessionId: "a" }));
    store.save(makeState({ sessionId: "b" }));
    store.save(makeState({ sessionId: "c" }));

    const list = store.list();
    expect(list).toHaveLength(3);
    const ids = list.map((s) => s.id).sort();
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("load non-existent returns null", () => {
    const store = createMemoryStore();
    expect(store.load("no-such")).toBeNull();
  });

  it("save updates existing session (upsert)", () => {
    const store = createMemoryStore();
    store.save(makeState({ sessionId: "upsert-test", turnNumber: 1 }));
    store.save(makeState({ sessionId: "upsert-test", turnNumber: 5 }));

    const loaded = store.load("upsert-test");
    expect(loaded!.turnNumber).toBe(5);
  });

  it("firstMessage is extracted from first user message", () => {
    const store = createMemoryStore();
    store.save(
      makeState({
        sessionId: "msg-test",
        messages: [
          { role: "user", content: "refactor this" },
          { role: "assistant", content: "ok" },
        ],
      }),
    );

    const list = store.list();
    const entry = list.find((s) => s.id === "msg-test");
    expect(entry!.firstMessage).toBe("refactor this");
  });

  it("close clears all sessions", () => {
    const store = createMemoryStore();
    store.save(makeState({ sessionId: "will-be-cleared" }));
    store.close();

    expect(store.load("will-be-cleared")).toBeNull();
    expect(store.list()).toHaveLength(0);
  });

  it("list is empty when no sessions exist", () => {
    const store = createMemoryStore();
    expect(store.list()).toHaveLength(0);
  });
});
