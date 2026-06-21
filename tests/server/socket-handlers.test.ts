import { describe, expect, it, vi } from "vitest";
import {
  registerClientMessageHandler,
  registerSessionHandlers,
  type RuntimeEvent,
} from "../../src/server/socket-handlers";
import type { ClientMessageEvent } from "../../packages/web/src/types/message";

describe("registerClientMessageHandler", () => {
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

  it("emits message_complete without stats when complete event has no stats", async () => {
    const emitted: Array<[string, unknown]> = [];
    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        yield { type: "complete" };
      }),
    };
    const socket = { emit: (event: string, payload: unknown) => emitted.push([event, payload]) };
    const handler = registerClientMessageHandler(runtime);
    const message: ClientMessageEvent = { messageId: "m2", sessionId: "s2", content: "hello", timestamp: 2 };

    await handler(socket, message);

    expect(emitted).toEqual([
      ["message_complete", { messageId: "m2", sessionId: "s2", stats: undefined }],
    ]);
  });

  it("emits message_error when runtime startTurn throws", async () => {
    const emitted: Array<[string, unknown]> = [];
    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        throw new Error("model unavailable");
      }),
    };
    const socket = { emit: (event: string, payload: unknown) => emitted.push([event, payload]) };
    const handler = registerClientMessageHandler(runtime);
    const message: ClientMessageEvent = { messageId: "m3", sessionId: "s3", content: "hi", timestamp: 3 };

    await handler(socket, message);

    expect(emitted).toEqual([
      ["message_error", { messageId: "m3", sessionId: "s3", code: "RUNTIME_ERROR", message: "model unavailable", retryable: true }],
    ]);
  });

  it("streams multiple tokens before completing", async () => {
    const emitted: Array<[string, unknown]> = [];
    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        yield { type: "token", token: "a" };
        yield { type: "token", token: "b" };
        yield { type: "token", token: "c" };
        yield { type: "complete", stats: { inputTokens: 10, outputTokens: 3, durationMs: 1 } };
      }),
    };
    const socket = { emit: (event: string, payload: unknown) => emitted.push([event, payload]) };
    const handler = registerClientMessageHandler(runtime);
    const message: ClientMessageEvent = { messageId: "m4", sessionId: "s4", content: "hi", timestamp: 4 };

    await handler(socket, message);

    expect(emitted).toEqual([
      ["stream_token", { messageId: "m4", sessionId: "s4", token: "a" }],
      ["stream_token", { messageId: "m4", sessionId: "s4", token: "b" }],
      ["stream_token", { messageId: "m4", sessionId: "s4", token: "c" }],
      ["message_complete", { messageId: "m4", sessionId: "s4", stats: { inputTokens: 10, outputTokens: 3, durationMs: 1 } }],
    ]);
  });
});

describe("registerSessionHandlers", () => {
  function makeSocket() {
    const handlers = new Map<string, (data: unknown) => void>();
    const emitted: Array<[string, unknown]> = [];
    return {
      emit: (event: string, payload: unknown) => emitted.push([event, payload]),
      on: (event: string, handler: (data: unknown) => void) => { handlers.set(event, handler); },
      handlers,
      emitted,
    };
  }

  const noopProvider = {
    renameSession: () => {},
    deleteSession: () => {},
  };

  it("returns session_list from provider", async () => {
    const socket = makeSocket();
    const provider = {
      listSessions: () => [{ id: "s1", createdAt: 1700000000000, updatedAt: 1700000001000, turnCount: 5, firstMessage: "Hello world" }],
      loadSessionMessages: () => null,
      ...noopProvider,
    };
    registerSessionHandlers(socket, provider);

    const getSessionsHandler = socket.handlers.get("get_sessions");
    expect(getSessionsHandler).toBeDefined();
    getSessionsHandler!(null);

    expect(socket.emitted).toHaveLength(1);
    const [event, payload] = socket.emitted[0]!;
    expect(event).toBe("session_list");
    expect((payload as { sessions: unknown[] }).sessions).toHaveLength(1);
  });

  it("returns empty session_list when listSessions throws", () => {
    const socket = makeSocket();
    const provider = {
      listSessions: () => { throw new Error("db connection lost"); },
      loadSessionMessages: () => null,
      ...noopProvider,
    };
    registerSessionHandlers(socket, provider);

    const getSessionsHandler = socket.handlers.get("get_sessions")!;
    getSessionsHandler(null);

    expect(socket.emitted).toEqual([
      ["session_list", { sessions: [] }],
    ]);
  });

  it("returns session_loaded with messages", () => {
    const socket = makeSocket();
    const messages = [{ role: "user" as const, content: "hello" }];
    const provider = {
      listSessions: () => [],
      loadSessionMessages: vi.fn(() => messages),
      ...noopProvider,
    };
    registerSessionHandlers(socket, provider);

    const loadSessionHandler = socket.handlers.get("load_session")!;
    loadSessionHandler({ sessionId: "load-test" });

    expect(provider.loadSessionMessages).toHaveBeenCalledWith("load-test");
    expect(socket.emitted).toHaveLength(1);
    const [event, payload] = socket.emitted[0]!;
    expect(event).toBe("session_loaded");
    const body = payload as { sessionId: string; messages: unknown[] };
    expect(body.sessionId).toBe("load-test");
    expect(body.messages).toHaveLength(1);
  });

  it("does not emit when loadSessionMessages returns null", () => {
    const socket = makeSocket();
    const provider = {
      listSessions: () => [],
      loadSessionMessages: () => null,
      ...noopProvider,
    };
    registerSessionHandlers(socket, provider);

    const loadSessionHandler = socket.handlers.get("load_session")!;
    loadSessionHandler({ sessionId: "nonexistent" });

    expect(socket.emitted).toHaveLength(0);
  });

  it("does not crash when loadSessionMessages throws", () => {
    const socket = makeSocket();
    const provider = {
      listSessions: () => [],
      loadSessionMessages: () => { throw new Error("disk read error"); },
      ...noopProvider,
    };
    registerSessionHandlers(socket, provider);

    const loadSessionHandler = socket.handlers.get("load_session")!;
    expect(() => loadSessionHandler({ sessionId: "bad" })).not.toThrow();
    expect(socket.emitted).toHaveLength(0);
  });

  it("is a no-op when socket does not have on method", () => {
    const socket = { emit: () => {} };
    const provider = {
      listSessions: () => [{ id: "x", createdAt: 0, updatedAt: 0, turnCount: 0, firstMessage: "" }],
      loadSessionMessages: () => null,
      ...noopProvider,
    };
    expect(() => registerSessionHandlers(socket, provider)).not.toThrow();
  });

  it("truncates long firstMessage in session summary preview", () => {
    const socket = makeSocket();
    const longText = "a".repeat(200);
    const provider = {
      listSessions: () => [{ id: "s-long", createdAt: 0, updatedAt: 0, turnCount: 0, firstMessage: longText }],
      loadSessionMessages: () => null,
      ...noopProvider,
    };
    registerSessionHandlers(socket, provider);

    const getSessionsHandler = socket.handlers.get("get_sessions")!;
    getSessionsHandler(null);

    const sessions = (socket.emitted[0]![1]! as { sessions: Array<{ firstMessagePreview: string; title: string }> }).sessions;
    expect(sessions[0]!.firstMessagePreview.length).toBe(100);
    expect(sessions[0]!.title.length).toBe(50);
  });

  it("uses 'Untitled' when firstMessage is empty", () => {
    const socket = makeSocket();
    const provider = {
      listSessions: () => [{ id: "s-empty", createdAt: 0, updatedAt: 0, turnCount: 0, firstMessage: "" }],
      loadSessionMessages: () => null,
      ...noopProvider,
    };
    registerSessionHandlers(socket, provider);

    const getSessionsHandler = socket.handlers.get("get_sessions")!;
    getSessionsHandler(null);

    const sessions = (socket.emitted[0]![1]! as { sessions: Array<{ title: string }> }).sessions;
    expect(sessions[0]!.title).toBe("Untitled");
  });

  it("rename_session updates title in session_list", () => {
    const socket = makeSocket();
    const provider = {
      listSessions: () => [{ id: "s1", createdAt: 0, updatedAt: 0, turnCount: 3, firstMessage: "Old title" }],
      loadSessionMessages: () => null,
      renameSession: vi.fn(),
      deleteSession: () => {},
    };
    registerSessionHandlers(socket, provider);

    const handler = socket.handlers.get("rename_session")!;
    handler({ sessionId: "s1", title: "New title" });

    expect(provider.renameSession).toHaveBeenCalledWith("s1", "New title");
    expect(socket.emitted).toHaveLength(1);
    expect(socket.emitted[0]![0]).toBe("session_list");
  });

  it("delete_session removes entry from session_list", () => {
    const socket = makeSocket();
    const sessions = [
      { id: "s1", createdAt: 0, updatedAt: 0, turnCount: 1, firstMessage: "A" },
      { id: "s2", createdAt: 0, updatedAt: 0, turnCount: 2, firstMessage: "B" },
    ];
    const provider = {
      listSessions: vi.fn(() => {
        // After deleteSession removes s1, list should only return s2
        return sessions.filter((s) => s.id !== "s1");
      }),
      loadSessionMessages: () => null,
      renameSession: () => {},
      deleteSession: vi.fn(),
    };
    registerSessionHandlers(socket, provider);

    const handler = socket.handlers.get("delete_session")!;
    handler({ sessionId: "s1" });

    expect(provider.deleteSession).toHaveBeenCalledWith("s1");
    expect(socket.emitted).toHaveLength(1);
    expect(socket.emitted[0]![0]).toBe("session_list");
    const emitted = socket.emitted[0]![1]! as { sessions: Array<{ id: string }> };
    expect(emitted.sessions).toHaveLength(1);
    expect(emitted.sessions[0]!.id).toBe("s2");
  });

  it("rename_session with non-existent id still emits session_list unchanged", () => {
    const socket = makeSocket();
    const sessions = [{ id: "s1", createdAt: 0, updatedAt: 0, turnCount: 1, firstMessage: "Only" }];
    const provider = {
      listSessions: () => sessions,
      loadSessionMessages: () => null,
      renameSession: vi.fn(),
      deleteSession: () => {},
    };
    registerSessionHandlers(socket, provider);

    const handler = socket.handlers.get("rename_session")!;
    handler({ sessionId: "nonexistent", title: "Ghost" });

    expect(provider.renameSession).toHaveBeenCalledWith("nonexistent", "Ghost");
    expect(socket.emitted).toHaveLength(1);
    const emitted = socket.emitted[0]![1]! as { sessions: Array<{ id: string }> };
    expect(emitted.sessions).toHaveLength(1);
    expect(emitted.sessions[0]!.id).toBe("s1");
  });

  it("delete_session with non-existent id still emits session_list unchanged", () => {
    const socket = makeSocket();
    const sessions = [{ id: "s1", createdAt: 0, updatedAt: 0, turnCount: 1, firstMessage: "Only" }];
    const provider = {
      listSessions: () => sessions,
      loadSessionMessages: () => null,
      renameSession: () => {},
      deleteSession: vi.fn(),
    };
    registerSessionHandlers(socket, provider);

    const handler = socket.handlers.get("delete_session")!;
    handler({ sessionId: "nonexistent" });

    expect(provider.deleteSession).toHaveBeenCalledWith("nonexistent");
    expect(socket.emitted).toHaveLength(1);
    const emitted = socket.emitted[0]![1]! as { sessions: Array<{ id: string }> };
    expect(emitted.sessions).toHaveLength(1);
  });
});
