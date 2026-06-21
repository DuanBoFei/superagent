/**
 * Gap ① 环境编排 · Real production stack assembly integration test.
 *
 * Verifies that the REAL production stack assembles and works end-to-end:
 *   WebServer.start() → SocketHub (auto-attached) → registerHandlers()
 *   → full connectivity chain via socket.io-client.
 *
 * This is distinct from socket.test.ts (which uses raw createServer + SocketHub)
 * and from e2e-connectivity.pwtest.ts (which uses an inline test server).
 * This test exercises the actual production HTTP pipeline: routing, CORS,
 * same-origin checks, health endpoint, Socket.io CORS, and port auto-selection.
 */

import { describe, expect, it } from "vitest";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { WebServer } from "../../src/server/index";
import type { ClientMessageEvent } from "../../packages/web/src/types/message";
import type { MessageRuntime, RuntimeEvent, SessionDataProvider } from "../../src/server/socket-handlers";

function waitForEvent<T>(socket: ClientSocket, event: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function createTestRuntime(tokens?: string[]): MessageRuntime {
  const t = tokens ?? ["Hello", " from ", "production", " stack"];
  return {
    async *startTurn(): AsyncGenerator<RuntimeEvent> {
      for (const token of t) {
        yield { type: "token", token };
      }
      yield { type: "complete", stats: { inputTokens: 10, outputTokens: t.length, durationMs: 42 } };
    },
  };
}

function createTestSessionProvider(): SessionDataProvider {
  return {
    listSessions: () => [
      { id: "prod-s1", createdAt: 1710000000000, updatedAt: 1710000001000, turnCount: 3, firstMessage: "Production test" },
      { id: "prod-s2", createdAt: 1710000002000, updatedAt: 1710000003000, turnCount: 1, firstMessage: "Another session" },
    ],
    loadSessionMessages: (id) => {
      if (id === "prod-s1") {
        return [
          { role: "user" as const, content: "Production test" },
          { role: "assistant" as const, content: "Working through real stack" },
        ];
      }
      return null;
    },
  };
}

describe("WebServer production stack assembly", () => {
  it("assembles real WebServer + SocketHub + handlers and serves full connectivity chain", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      // Verify the production HTTP pipeline is alive
      const healthRes = await fetch(`http://127.0.0.1:${result.port}/api/health`);
      expect(healthRes.status).toBe(200);
      const healthBody = await healthRes.json() as { status: string };
      expect(healthBody.status).toBe("ok");

      // Verify SocketHub is attached by the production start() flow
      const hub = server.getIO();
      expect(hub).toBeDefined();
      expect(hub.io.httpServer).toBe(server.getHttpServer());

      // Verify production CORS: only localhost/127.0.0.1 allowed
      expect(hub.isOriginAllowed("http://localhost:3000")).toBe(true);
      expect(hub.isOriginAllowed("http://127.0.0.1:3456")).toBe(true);
      expect(hub.isOriginAllowed("http://example.com")).toBe(false);
      expect(hub.isOriginAllowed(undefined)).toBe(true);

      // Register handlers — the production wiring path
      const runtime = createTestRuntime();
      const sessionProvider = createTestSessionProvider();
      hub.registerHandlers(runtime, sessionProvider);

      // Verify double-register is idempotent (production code path)
      hub.registerHandlers(runtime, sessionProvider);

      // Connect via socket.io-client (same protocol as browser bundled client)
      const client = ioc(`http://127.0.0.1:${result.port}`, {
        forceNew: true,
        transports: ["websocket"],
      });

      try {
        await new Promise<void>((resolve) => client.on("connect", resolve));

        // --- Test 1: session_list via real SocketHub handlers ---
        const sessionListPromise = waitForEvent<{ sessions: unknown[] }>(client, "session_list");
        client.emit("get_sessions");
        const sessionList = await sessionListPromise;
        expect(sessionList.sessions).toHaveLength(2);
        expect((sessionList.sessions[0] as Record<string, unknown>).id).toBe("prod-s1");

        // --- Test 2: client_send → stream_token → message_complete ---
        const tokens: string[] = [];
        const completePromise = new Promise<{ stats: unknown }>((resolve) => {
          client.on("stream_token", (payload: { token: string }) => {
            tokens.push(payload.token);
          });
          client.once("message_complete", (payload) => resolve(payload as { stats: unknown }));
        });

        const msg: ClientMessageEvent = {
          messageId: "prod-msg-1",
          sessionId: "prod-s1",
          content: "Hello production stack",
          timestamp: Date.now(),
        };
        client.emit("client_send", msg);

        const complete = await completePromise;
        expect(tokens).toEqual(["Hello", " from ", "production", " stack"]);
        expect(complete.stats).toBeTruthy();

        // --- Test 3: load_session via real handlers ---
        client.emit("load_session", { sessionId: "prod-s1" });
        const loaded = await waitForEvent<{ sessionId: string; messages: Array<{ role: string; content: string }> }>(
          client,
          "session_loaded",
        );
        expect(loaded.sessionId).toBe("prod-s1");
        expect(loaded.messages).toHaveLength(2);
        expect(loaded.messages[0]).toMatchObject({ role: "user", content: "Production test" });

        // --- Test 4: unknown session does not emit ---
        let falseLoaded = false;
        client.on("session_loaded", () => { falseLoaded = true; });
        client.emit("load_session", { sessionId: "nonexistent" });
        await new Promise((r) => setTimeout(r, 150));
        // falseLoaded may be true from the previous load_session; reset and test
        falseLoaded = false;
        client.emit("load_session", { sessionId: "also-fake" });
        await new Promise((r) => setTimeout(r, 150));
        expect(falseLoaded).toBe(false);

        // --- Test 5: concurrent connections through real stack ---
        const client2 = ioc(`http://127.0.0.1:${result.port}`, {
          forceNew: true,
          transports: ["websocket"],
        });

        try {
          await new Promise<void>((r) => client2.on("connect", r));

          const s2 = waitForEvent<{ sessions: unknown[] }>(client2, "session_list");
          client2.emit("get_sessions");
          const list2 = await s2;
          expect(list2.sessions).toHaveLength(2);

          // Both clients get independent token streams
          const t1: string[] = [];
          const t2: string[] = [];
          const d1 = new Promise<void>((r) => {
            client.on("stream_token", (p: { token: string }) => t1.push(p.token));
            client.once("message_complete", () => r());
          });
          const d2 = new Promise<void>((r) => {
            client2.on("stream_token", (p: { token: string }) => t2.push(p.token));
            client2.once("message_complete", () => r());
          });

          client.emit("client_send", { messageId: "c1", sessionId: "s1", content: "a", timestamp: 0 });
          client2.emit("client_send", { messageId: "c2", sessionId: "s2", content: "b", timestamp: 0 });

          await Promise.all([d1, d2]);
          expect(t1.join("")).toBe("Hello from production stack");
          expect(t2.join("")).toBe("Hello from production stack");
        } finally {
          client2.disconnect();
        }
      } finally {
        client.disconnect();
      }
    } finally {
      await server.shutdown();
    }
  });

  it("production stack survives handler errors and emits message_error", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const hub = server.getIO();

      const failingRuntime: MessageRuntime = {
        async *startTurn(): AsyncGenerator<RuntimeEvent> {
          throw new Error("API key invalid");
        },
      };

      const sessionProvider: SessionDataProvider = {
        listSessions: () => [],
        loadSessionMessages: () => null,
      };

      hub.registerHandlers(failingRuntime, sessionProvider);

      const client = ioc(`http://127.0.0.1:${result.port}`, {
        forceNew: true,
        transports: ["websocket"],
      });

      try {
        await new Promise<void>((resolve) => client.on("connect", resolve));

        const errorPromise = waitForEvent<{ code: string; message: string; retryable: boolean }>(
          client,
          "message_error",
        );

        client.emit("client_send", {
          messageId: "err-prod",
          sessionId: "s-err",
          content: "bad request",
          timestamp: 0,
        });

        const error = await errorPromise;
        expect(error.code).toBe("RUNTIME_ERROR");
        expect(error.message).toBe("API key invalid");
        expect(error.retryable).toBe(true);
      } finally {
        client.disconnect();
      }
    } finally {
      await server.shutdown();
    }
  });

  it("WebServer start() auto-selects port when 0 is given", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      expect(result.port).toBeGreaterThan(0);
      expect(result.port).toBeLessThan(65536);
      expect(result.url).toContain(String(result.port));
    } finally {
      await server.shutdown();
    }
  });

  it("health endpoint reflects server uptime", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const res = await fetch(`http://127.0.0.1:${result.port}/api/health`);
      const body = await res.json() as { status: string; uptime: number };
      expect(body.status).toBe("ok");
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    } finally {
      await server.shutdown();
    }
  });
});
