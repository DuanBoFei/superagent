import { describe, expect, it } from "vitest";
import { createPersistence, SessionCorruptedError } from "../../src/persistence";

describe("Persistence contract", () => {
  it("public API exports createPersistence and SessionCorruptedError", () => {
    expect(typeof createPersistence).toBe("function");
    expect(typeof SessionCorruptedError).toBe("function");
  });

  it("SessionManager instance has expected method names", () => {
    // Use :memory: path to avoid filesystem dependency
    const mgr = createPersistence(":memory:");
    try {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(mgr)).filter(
        (k) => typeof (mgr as Record<string, unknown>)[k] === "function",
      );
      expect(methods.sort()).toMatchSnapshot();
    } finally {
      mgr.close();
    }
  });

  it("save returns { success: true } for valid state", () => {
    const mgr = createPersistence(":memory:");
    try {
      const result = mgr.save({
        sessionId: "contract-test",
        turnNumber: 0,
        messages: [{ role: "user", content: "hello" }],
        toolResults: [],
        state: "IDLE",
        interruptFlag: false,
        startedAt: Date.now(),
      });
      expect(result).toEqual({ success: true });
    } finally {
      mgr.close();
    }
  });

  it("SessionSummary shape matches expected fields", () => {
    const mgr = createPersistence(":memory:");
    try {
      mgr.save({
        sessionId: "shape-test",
        turnNumber: 1,
        messages: [{ role: "user", content: "test" }],
        toolResults: [],
        state: "IDLE",
        interruptFlag: false,
        startedAt: 1700000000000,
      });

      const list = mgr.list();
      expect(list).toHaveLength(1);
      const summary = list[0]!;
      const keys = Object.keys(summary).sort();
      expect(keys).toEqual(["createdAt", "date", "firstMessage", "id", "turns", "updatedAt"]);
      expect(typeof summary.id).toBe("string");
      expect(typeof summary.date).toBe("string");
      expect(typeof summary.turns).toBe("number");
      expect(typeof summary.firstMessage).toBe("string");
    } finally {
      mgr.close();
    }
  });

  it("load returns SessionState with all required fields", () => {
    const mgr = createPersistence(":memory:");
    try {
      mgr.save({
        sessionId: "required-fields-test",
        turnNumber: 5,
        messages: [{ role: "user", content: "refactor" }],
        toolResults: [{ name: "Read", success: true, output: "content" }],
        state: "THINKING",
        interruptFlag: true,
        startedAt: 1712345678000,
      });

      const loaded = mgr.load("required-fields-test");
      expect(loaded).not.toBeNull();
      const keys = Object.keys(loaded!).sort();
      expect(keys).toEqual([
        "interruptFlag",
        "messages",
        "sessionId",
        "startedAt",
        "state",
        "toolResults",
        "turnNumber",
      ]);
    } finally {
      mgr.close();
    }
  });

  it("list returns empty array when no sessions", () => {
    const mgr = createPersistence(":memory:");
    try {
      expect(mgr.list()).toEqual([]);
    } finally {
      mgr.close();
    }
  });
});
