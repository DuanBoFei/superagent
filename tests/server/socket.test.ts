import { describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { WebServer } from "../../src/server/index";
import { SocketHub } from "../../src/server/socket-hub";
import type { ClientMessageEvent } from "../../packages/web/src/types/message";
import type { RuntimeEvent } from "../../src/server/socket-handlers";
import type { SessionDataProvider } from "../../src/server/socket-handlers";

function createTestServer(): Promise<{ server: Server; port: number }> {
  const srv = createServer();
  return new Promise((resolve, reject) => {
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (typeof addr === "object" && addr) {
        resolve({ server: srv, port: addr.port });
      } else {
        reject(new Error("No address"));
      }
    });
  });
}

function waitForEvent<T>(socket: ClientSocket, event: string, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe("WebServer socket hub", () => {
  it("attaches a localhost-only socket hub when started", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const io = server.getIO();
      expect(io.httpServer).toBe(server.getHttpServer());
      expect(io.isOriginAllowed(`http://localhost:${result.port}`)).toBe(true);
      expect(io.isOriginAllowed(`http://127.0.0.1:${result.port}`)).toBe(true);
      expect(io.isOriginAllowed("http://example.com")).toBe(false);
    } finally {
      await server.shutdown();
    }
  });
});

describe("SocketHub handler registration", () => {
  it("routes client_send events through MessageRuntime and streams tokens back", async () => {
    const { server, port } = await createTestServer();
    const hub = new SocketHub(server, () => port);

    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        yield { type: "token", token: "Hello" };
        yield { type: "token", token: " world" };
        yield { type: "complete" };
      }),
    };

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [],
      loadSessionMessages: () => null,
    };

    hub.registerHandlers(runtime, sessionProvider);

    const client = ioc(`http://127.0.0.1:${port}`, { forceNew: true, transports: ["websocket"] });

    try {
      await new Promise<void>((resolve) => client.on("connect", resolve));

      const msg: ClientMessageEvent = {
        messageId: "m1",
        sessionId: "s1",
        content: "hi",
        timestamp: Date.now(),
      };

      const tokenPromise = new Promise<string[]>((resolve) => {
        const tokens: string[] = [];
        client.on("stream_token", (payload: { token: string }) => {
          tokens.push(payload.token);
          if (tokens.join("") === "Hello world") resolve(tokens);
        });
      });

      client.emit("client_send", msg);

      const tokens = await tokenPromise;
      expect(tokens).toEqual(["Hello", " world"]);
      expect(runtime.startTurn).toHaveBeenCalledWith(msg);
    } finally {
      client.disconnect();
      hub.io.close();
      server.close();
    }
  });

  it("routes get_sessions to session_list response", async () => {
    const { server, port } = await createTestServer();
    const hub = new SocketHub(server, () => port);

    const sessions = [
      { id: "s1", createdAt: 1700000000000, updatedAt: 1700000001000, turnCount: 5, firstMessage: "Hello world" },
    ];

    const sessionProvider: SessionDataProvider = {
      listSessions: () => sessions,
      loadSessionMessages: () => null,
    };

    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        yield { type: "complete" };
      }),
    };

    hub.registerHandlers(runtime, sessionProvider);

    const client = ioc(`http://127.0.0.1:${port}`, { forceNew: true, transports: ["websocket"] });

    try {
      await new Promise<void>((resolve) => client.on("connect", resolve));

      const response = waitForEvent<{ sessions: unknown[] }>(client, "session_list");
      client.emit("get_sessions");

      const payload = await response;
      expect(payload.sessions).toHaveLength(1);
      expect(payload.sessions[0]).toMatchObject({ id: "s1" });
    } finally {
      client.disconnect();
      hub.io.close();
      server.close();
    }
  });

  it("registers handlers only once", async () => {
    const { server, port } = await createTestServer();
    const hub = new SocketHub(server, () => port);

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [],
      loadSessionMessages: () => null,
    };

    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        yield { type: "complete" };
      }),
    };

    hub.registerHandlers(runtime, sessionProvider);
    hub.registerHandlers(runtime, sessionProvider); // second call should no-op

    const client = ioc(`http://127.0.0.1:${port}`, { forceNew: true, transports: ["websocket"] });

    try {
      await new Promise<void>((resolve) => client.on("connect", resolve));

      const response = waitForEvent<{ sessions: unknown[] }>(client, "session_list");
      client.emit("get_sessions");
      await response;

      // Should still work — double register shouldn't break or duplicate
      expect(runtime.startTurn).not.toHaveBeenCalled();
    } finally {
      client.disconnect();
      hub.io.close();
      server.close();
    }
  });

  it("routes load_session to session_loaded with stored messages", async () => {
    const { server, port } = await createTestServer();
    const hub = new SocketHub(server, () => port);

    const storedMessages = [
      { role: "user" as const, content: "hello" },
      { role: "assistant" as const, content: "hi there" },
    ];

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [],
      loadSessionMessages: (id) => (id === "loaded-session" ? storedMessages : null),
    };

    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        yield { type: "complete" };
      }),
    };

    hub.registerHandlers(runtime, sessionProvider);

    const client = ioc(`http://127.0.0.1:${port}`, { forceNew: true, transports: ["websocket"] });

    try {
      await new Promise<void>((resolve) => client.on("connect", resolve));

      const response = waitForEvent<{ sessionId: string; messages: Array<{ role: string; content: string }> }>(client, "session_loaded");
      client.emit("load_session", { sessionId: "loaded-session" });

      const payload = await response;
      expect(payload.sessionId).toBe("loaded-session");
      expect(payload.messages).toHaveLength(2);
      expect(payload.messages[0]).toMatchObject({ role: "user", content: "hello" });
    } finally {
      client.disconnect();
      hub.io.close();
      server.close();
    }
  });

  it("does not emit session_loaded for unknown session ids", async () => {
    const { server, port } = await createTestServer();
    const hub = new SocketHub(server, () => port);

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [],
      loadSessionMessages: () => null,
    };

    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        yield { type: "complete" };
      }),
    };

    hub.registerHandlers(runtime, sessionProvider);

    const client = ioc(`http://127.0.0.1:${port}`, { forceNew: true, transports: ["websocket"] });

    try {
      await new Promise<void>((resolve) => client.on("connect", resolve));

      let received = false;
      client.on("session_loaded", () => { received = true; });
      client.emit("load_session", { sessionId: "nonexistent" });

      // Wait briefly to ensure no event arrives
      await new Promise((r) => setTimeout(r, 200));
      expect(received).toBe(false);
    } finally {
      client.disconnect();
      hub.io.close();
      server.close();
    }
  });

  it("emits message_error to client when runtime throws", async () => {
    const { server, port } = await createTestServer();
    const hub = new SocketHub(server, () => port);

    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        throw new Error("API key invalid");
      }),
    };

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [],
      loadSessionMessages: () => null,
    };

    hub.registerHandlers(runtime, sessionProvider);

    const client = ioc(`http://127.0.0.1:${port}`, { forceNew: true, transports: ["websocket"] });

    try {
      await new Promise<void>((resolve) => client.on("connect", resolve));

      const errorPromise = waitForEvent<{ code: string; message: string; retryable: boolean }>(client, "message_error");
      client.emit("client_send", { messageId: "err-1", sessionId: "s-err", content: "bad", timestamp: 0 });

      const error = await errorPromise;
      expect(error.code).toBe("RUNTIME_ERROR");
      expect(error.message).toBe("API key invalid");
      expect(error.retryable).toBe(true);
    } finally {
      client.disconnect();
      hub.io.close();
      server.close();
    }
  });

  it("supports multiple concurrent client connections", async () => {
    const { server, port } = await createTestServer();
    const hub = new SocketHub(server, () => port);

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [],
      loadSessionMessages: () => null,
    };

    const runtime = {
      startTurn: vi.fn(async function* (): AsyncGenerator<RuntimeEvent> {
        yield { type: "token", token: "ok" };
        yield { type: "complete" };
      }),
    };

    hub.registerHandlers(runtime, sessionProvider);

    const client1 = ioc(`http://127.0.0.1:${port}`, { forceNew: true, transports: ["websocket"] });
    const client2 = ioc(`http://127.0.0.1:${port}`, { forceNew: true, transports: ["websocket"] });

    try {
      await Promise.all([
        new Promise<void>((r) => client1.on("connect", r)),
        new Promise<void>((r) => client2.on("connect", r)),
      ]);

      // Both clients get session_list on get_sessions
      const r1 = waitForEvent(client1, "session_list");
      const r2 = waitForEvent(client2, "session_list");
      client1.emit("get_sessions");
      client2.emit("get_sessions");
      await Promise.all([r1, r2]);

      // Both clients can send messages and get tokens
      const t1 = new Promise<void>((resolve) => client1.on("stream_token", () => resolve()));
      const t2 = new Promise<void>((resolve) => client2.on("stream_token", () => resolve()));
      client1.emit("client_send", { messageId: "c1", sessionId: "s1", content: "a", timestamp: 0 });
      client2.emit("client_send", { messageId: "c2", sessionId: "s2", content: "b", timestamp: 0 });
      await Promise.all([t1, t2]);

      expect(runtime.startTurn).toHaveBeenCalledTimes(2);
    } finally {
      client1.disconnect();
      client2.disconnect();
      hub.io.close();
      server.close();
    }
  });
});
