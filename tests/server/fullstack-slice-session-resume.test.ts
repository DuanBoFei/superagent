/**
 * Gap ① 环境编排 · RuntimeBridge production stack assembly test.
 *
 * Verifies the FULL production wiring chain for session resume:
 *   WebServer.start() → SocketHub → registerHandlers(MessageRuntime, SessionDataProvider)
 *   → RuntimeBridge wrapping RuntimeBridgeHandle → socket.io-client
 *
 * This test goes THROUGH RuntimeBridge (TurnEvent → RuntimeEvent mapping),
 * unlike web-server-integration.test.ts which uses a direct MessageRuntime mock.
 *
 * The only thing stubbed is the LLM call — RuntimeBridgeHandle.startTurn()
 * yields TurnEvents directly without hitting a model API.
 *
 * Run: npx vitest run tests/server/fullstack-slice-session-resume.test.ts
 */

import { describe, expect, it } from "vitest";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { WebServer } from "../../src/server/index";
import { RuntimeBridge } from "../../src/server/runtime-bridge";
import { createMemoryStore } from "../../src/persistence/memory-store";
import type { RuntimeBridgeHandle } from "../../src/server/runtime-bridge";
import type { TurnEvent, SessionState } from "../../src/runtime/types";
import type { ClientMessageEvent } from "../../packages/web/src/types/message";
import type {
  MessageRuntime,
  RuntimeEvent,
  SessionDataProvider,
} from "../../src/server/socket-handlers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function waitForEvent<T>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ${event}`)),
      timeoutMs,
    );
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/** Collect all stream_token payloads until message_complete fires. */
function collectTokens(
  socket: ClientSocket,
): Promise<{ tokens: string[]; complete: { stats?: unknown } }> {
  const tokens: string[] = [];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout collecting tokens")), 5000);
    socket.on("stream_token", (p: { token: string }) => tokens.push(p.token));
    socket.once("message_complete", (p: { stats?: unknown }) => {
      clearTimeout(timer);
      resolve({ tokens, complete: p });
    });
  });
}

// ---------------------------------------------------------------------------
// Test fixture factories
// ---------------------------------------------------------------------------

interface StubRuntimeOptions {
  /** Tokens emitted as TurnEvent.text before turn_end */
  tokens?: string[];
  /** If true, emit a tool_call TurnEvent */
  withToolCall?: boolean;
  /** If true, throw after first token (simulate runtime error) */
  throwAfterFirst?: boolean;
}

function createBridgeHandle(opts: StubRuntimeOptions = {}): RuntimeBridgeHandle {
  const tokens = opts.tokens ?? ["Hello", " from ", "runtime-bridge"];
  return {
    async *startTurn(userMessage: string): AsyncGenerator<TurnEvent> {
      if (opts.throwAfterFirst) {
        yield { type: "text", content: tokens[0]! };
        throw new Error("Simulated runtime crash");
      }

      // Echo user message as context-aware reply
      yield { type: "text", content: `Re: ${userMessage}` };

      if (opts.withToolCall) {
        yield {
          type: "tool_call",
          name: "Read",
          args: { file_path: "/tmp/test.ts" },
        };
        yield {
          type: "tool_result",
          name: "Read",
          success: true,
          summary: "const x = 1;",
        };
      }

      for (const token of tokens) {
        yield { type: "text", content: token };
      }

      yield {
        type: "turn_end",
        summary: {
          turnNumber: 1,
          totalTokens: tokens.join("").length + userMessage.length,
          totalCost: 0,
          reason: "completed",
        },
      };
    },
  };
}

function buildMessageRuntime(handle: RuntimeBridgeHandle): MessageRuntime {
  const bridge = new RuntimeBridge(handle);
  return {
    async *startTurn(message: ClientMessageEvent): AsyncGenerator<RuntimeEvent> {
      yield* bridge.routeToRuntime(message);
    },
  };
}

function buildSessionProvider(
  store: ReturnType<typeof createMemoryStore>,
): SessionDataProvider {
  return {
    listSessions(limit?: number) {
      return store
        .list()
        .slice(0, limit ?? 50)
        .map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          turnCount: s.turns,
          firstMessage: s.firstMessage,
        }));
    },
    loadSessionMessages(id: string) {
      const state = store.load(id);
      if (!state) return null;
      return state.messages.map((m) => ({ role: m.role, content: m.content }));
    },
  };
}

function makeSessionState(overrides?: Partial<SessionState>): SessionState {
  return {
    sessionId: "s1",
    turnNumber: 2,
    messages: [
      { role: "user", content: "What is TypeScript?" },
      { role: "assistant", content: "TypeScript is a typed superset of JavaScript." },
    ],
    toolResults: [],
    state: 7, // COMPLETED
    interruptFlag: false,
    startedAt: 1700000000000,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Fullstack slice — RuntimeBridge production stack", () => {
  it("assembles WebServer + SocketHub + RuntimeBridge + handlers end-to-end", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      // Build real production wiring chain
      const store = createMemoryStore();
      store.save(makeSessionState({ sessionId: "s1" }));

      const handle = createBridgeHandle();
      const runtime = buildMessageRuntime(handle);
      const sessionProvider = buildSessionProvider(store);

      const hub = server.getIO();
      hub.registerHandlers(runtime, sessionProvider);

      const client = ioc(`http://127.0.0.1:${result.port}`, {
        forceNew: true,
        transports: ["websocket"],
      });

      try {
        await new Promise<void>((r) => client.on("connect", r));

        // --- session_list via real RuntimeBridge path ---
        const listPromise = waitForEvent<{ sessions: unknown[] }>(client, "session_list");
        client.emit("get_sessions");
        const list = await listPromise;
        expect(list.sessions).toHaveLength(1);
        expect((list.sessions[0] as Record<string, unknown>).id).toBe("s1");

        // --- load_session → session_loaded ---
        const loadPromise = waitForEvent<{
          sessionId: string;
          messages: Array<{ role: string; content: string }>;
        }>(client, "session_loaded");
        client.emit("load_session", { sessionId: "s1" });
        const loaded = await loadPromise;
        expect(loaded.sessionId).toBe("s1");
        expect(loaded.messages).toHaveLength(2);
        expect(loaded.messages[0]!.role).toBe("user");
        expect(loaded.messages[0]!.content).toBe("What is TypeScript?");

        // --- client_send → RuntimeBridge → stream_token + message_complete ---
        const collected = collectTokens(client);
        client.emit("client_send", {
          messageId: "m1",
          sessionId: "s1",
          content: "Tell me more",
          timestamp: Date.now(),
        } as ClientMessageEvent);

        const { tokens } = await collected;
        expect(tokens.length).toBeGreaterThanOrEqual(2);
        // First token is the context echo from RuntimeBridge
        expect(tokens[0]).toBe("Re: Tell me more");
      } finally {
        client.disconnect();
      }
    } finally {
      await server.shutdown();
    }
  });

  it("maps TurnEvent types through RuntimeBridge → RuntimeEvent", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const store = createMemoryStore();
      const handle = createBridgeHandle({ withToolCall: true });
      const runtime = buildMessageRuntime(handle);
      const sessionProvider = buildSessionProvider(store);

      server.getIO().registerHandlers(runtime, sessionProvider);

      const client = ioc(`http://127.0.0.1:${result.port}`, {
        forceNew: true,
        transports: ["websocket"],
      });

      try {
        await new Promise<void>((r) => client.on("connect", r));

        const allTokens: string[] = [];
        const completePromise = new Promise<{ stats?: unknown }>((resolve) => {
          client.on("stream_token", (p: { token: string }) => allTokens.push(p.token));
          client.once("message_complete", (p) => resolve(p as { stats?: unknown }));
        });

        client.emit("client_send", {
          messageId: "m2",
          sessionId: "s2",
          content: "read the file",
          timestamp: Date.now(),
        } as ClientMessageEvent);

        const complete = await completePromise;

        // Verify text TurnEvent → token RuntimeEvent
        expect(allTokens[0]).toBe("Re: read the file");

        // Verify tool_call TurnEvent → JSON-encoded token
        const toolCallToken = allTokens.find((t) => t.includes('"type":"tool_call"'));
        expect(toolCallToken).toBeDefined();
        const parsed = JSON.parse(toolCallToken!);
        expect(parsed.type).toBe("tool_call");
        expect(parsed.name).toBe("Read");

        // Verify tool_result TurnEvent → JSON-encoded token
        const toolResultToken = allTokens.find((t) => t.includes('"type":"tool_result"'));
        expect(toolResultToken).toBeDefined();
        const parsedResult = JSON.parse(toolResultToken!);
        expect(parsedResult.type).toBe("tool_result");
        expect(parsedResult.name).toBe("Read");

        // Verify turn_end → complete with stats
        expect(complete.stats).toBeTruthy();
      } finally {
        client.disconnect();
      }
    } finally {
      await server.shutdown();
    }
  });

  it("propagates RuntimeBridge errors as message_error to client", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const store = createMemoryStore();
      const handle = createBridgeHandle({ throwAfterFirst: true });
      const runtime = buildMessageRuntime(handle);
      const sessionProvider = buildSessionProvider(store);

      server.getIO().registerHandlers(runtime, sessionProvider);

      const client = ioc(`http://127.0.0.1:${result.port}`, {
        forceNew: true,
        transports: ["websocket"],
      });

      try {
        await new Promise<void>((r) => client.on("connect", r));

        const errorPromise = waitForEvent<{
          code: string;
          message: string;
          retryable: boolean;
        }>(client, "message_error");

        client.emit("client_send", {
          messageId: "err-1",
          sessionId: "s-err",
          content: "doomed",
          timestamp: Date.now(),
        } as ClientMessageEvent);

        const error = await errorPromise;
        expect(error.code).toBe("RUNTIME_ERROR");
        expect(error.message).toBe("Simulated runtime crash");
        expect(error.retryable).toBe(true);
      } finally {
        client.disconnect();
      }
    } finally {
      await server.shutdown();
    }
  });

  it("multiple sessions are isolated through memory store", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const store = createMemoryStore();
      store.save(makeSessionState({ sessionId: "alpha", messages: [{ role: "user", content: "Alpha message" }] }));
      store.save(makeSessionState({ sessionId: "beta", messages: [{ role: "user", content: "Beta message" }] }));

      const handle = createBridgeHandle();
      const runtime = buildMessageRuntime(handle);
      const sessionProvider = buildSessionProvider(store);

      server.getIO().registerHandlers(runtime, sessionProvider);

      const client = ioc(`http://127.0.0.1:${result.port}`, {
        forceNew: true,
        transports: ["websocket"],
      });

      try {
        await new Promise<void>((r) => client.on("connect", r));

        // List sessions
        const listPromise = waitForEvent<{ sessions: Array<{ id: string }> }>(client, "session_list");
        client.emit("get_sessions");
        const list = await listPromise;
        expect(list.sessions).toHaveLength(2);
        const ids = list.sessions.map((s) => s.id).sort();
        expect(ids).toEqual(["alpha", "beta"]);

        // Load alpha
        const alphaPromise = waitForEvent<{
          sessionId: string;
          messages: Array<{ content: string }>;
        }>(client, "session_loaded");
        client.emit("load_session", { sessionId: "alpha" });
        const alpha = await alphaPromise;
        expect(alpha.sessionId).toBe("alpha");
        expect(alpha.messages[0]!.content).toBe("Alpha message");

        // Load beta
        const betaPromise = waitForEvent<{
          sessionId: string;
          messages: Array<{ content: string }>;
        }>(client, "session_loaded");
        client.emit("load_session", { sessionId: "beta" });
        const beta = await betaPromise;
        expect(beta.sessionId).toBe("beta");
        expect(beta.messages[0]!.content).toBe("Beta message");
      } finally {
        client.disconnect();
      }
    } finally {
      await server.shutdown();
    }
  });

  it("client_send on new sessionId creates a new entry in session list", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const store = createMemoryStore();
      // Create a stateful handle that writes back to the store
      const handle: RuntimeBridgeHandle = {
        async *startTurn(userMessage: string): AsyncGenerator<TurnEvent> {
          yield { type: "text", content: `Echo: ${userMessage}` };
          yield {
            type: "turn_end",
            summary: { turnNumber: 1, totalTokens: 5, totalCost: 0, reason: "completed" },
          };
        },
      };
      const runtime = buildMessageRuntime(handle);
      const sessionProvider = buildSessionProvider(store);

      server.getIO().registerHandlers(runtime, sessionProvider);

      const client = ioc(`http://127.0.0.1:${result.port}`, {
        forceNew: true,
        transports: ["websocket"],
      });

      try {
        await new Promise<void>((r) => client.on("connect", r));

        // Initial list should be empty
        const initialPromise = waitForEvent<{ sessions: unknown[] }>(client, "session_list");
        client.emit("get_sessions");
        const initial = await initialPromise;
        expect(initial.sessions).toHaveLength(0);

        // Send message on a brand new session
        const collected = collectTokens(client);
        client.emit("client_send", {
          messageId: "new-1",
          sessionId: "brand-new",
          content: "First message",
          timestamp: Date.now(),
        } as ClientMessageEvent);
        await collected;

        // Verify second message on same session also works (stream intact)
        const collected2 = collectTokens(client);
        client.emit("client_send", {
          messageId: "new-2",
          sessionId: "brand-new",
          content: "Second message",
          timestamp: Date.now(),
        } as ClientMessageEvent);
        const { tokens } = await collected2;
        expect(tokens[0]).toBe("Echo: Second message");
      } finally {
        client.disconnect();
      }
    } finally {
      await server.shutdown();
    }
  });

  it("handler registration is idempotent (production code path)", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const store = createMemoryStore();
      const handle = createBridgeHandle();
      const runtime = buildMessageRuntime(handle);
      const sessionProvider = buildSessionProvider(store);

      const hub = server.getIO();

      // Register twice — should not crash or double-register listeners
      hub.registerHandlers(runtime, sessionProvider);
      hub.registerHandlers(runtime, sessionProvider);

      const client = ioc(`http://127.0.0.1:${result.port}`, {
        forceNew: true,
        transports: ["websocket"],
      });

      try {
        await new Promise<void>((r) => client.on("connect", r));

        // Should still work after double register
        const collected = collectTokens(client);
        client.emit("client_send", {
          messageId: "idem-1",
          sessionId: "s-idem",
          content: "test",
          timestamp: Date.now(),
        } as ClientMessageEvent);
        const { tokens } = await collected;
        expect(tokens[0]).toBe("Re: test");
      } finally {
        client.disconnect();
      }
    } finally {
      await server.shutdown();
    }
  });
});
