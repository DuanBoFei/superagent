import { describe, expect, it, vi } from "vitest";
import { createChatStore, createSessionStore, initializeSessionId, loadSessionHistory } from "../../packages/web/src/store/chat";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  };
}

describe("session persistence", () => {
  it("loads an existing session id from storage", () => {
    const storage = memoryStorage({ superagent_session_id: "session_existing" });

    expect(initializeSessionId(storage)).toBe("session_existing");
  });

  it("creates and persists a new session id", () => {
    const storage = memoryStorage();
    const sessionId = initializeSessionId(storage, () => "session_new");

    expect(sessionId).toBe("session_new");
    expect(storage.getItem("superagent_session_id")).toBe("session_new");
  });

  it("creates a new session and clears messages", () => {
    const storage = memoryStorage({ superagent_session_id: "session_old" });
    const store = createChatStore("session_old");
    const sessions = createSessionStore(store, storage, () => "session_next");

    store.addMessage({ id: "m1", role: "user", content: "hello", timestamp: 1, status: "sent" });
    sessions.createNewSession();

    expect(store.getState().currentSessionId).toBe("session_next");
    expect(store.getState().messages).toEqual([]);
    expect(storage.getItem("superagent_session_id")).toBe("session_next");
  });

  it("loads persisted messages for the current session", async () => {
    const store = createChatStore("session_1");
    const source = {
      loadMessages: vi.fn(async () => [{ id: "m1", role: "assistant" as const, content: "restored", timestamp: 1, status: "sent" as const }]),
    };

    await loadSessionHistory(store, source);

    expect(source.loadMessages).toHaveBeenCalledWith("session_1");
    expect(store.getState().messages).toEqual([{ id: "m1", role: "assistant", content: "restored", timestamp: 1, status: "sent" }]);
  });
});
