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
});
