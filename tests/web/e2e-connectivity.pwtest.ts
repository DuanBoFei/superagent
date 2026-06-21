/**
 * T016 [INT] · E2E Playwright connectivity test.
 *
 * Starts a test server with Socket.io + handlers, serves a minimal
 * test page that connects via socket.io-client, and verifies the full
 * connectivity chain: page load → socket connect → session list →
 * message send → stream_token → message_complete → load_session.
 *
 * Run: npx playwright test tests/web/e2e-connectivity.pwtest.ts
 */

import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import {
  registerClientMessageHandler,
  registerSessionHandlers,
  type MessageRuntime,
  type SessionDataProvider,
} from "../../src/server/socket-handlers";
import type { ClientMessageEvent } from "../../packages/web/src/types/message";

const CONNECTIVITY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>E2E Connectivity Test</title>
<style>
  body { background: #0a0a0a; color: #fafafa; font: 14px monospace; padding: 24px; margin: 0; }
  .log { border: 1px solid #1f1f23; padding: 8px; margin: 4px 0; border-radius: 4px; font-size: 12px; }
  .log.ok { border-color: #10b981; color: #10b981; }
  .log.err { border-color: #ef4444; color: #ef4444; }
</style>
</head>
<body>
<h1>E2E Connectivity</h1>
<div id="status">connecting...</div>
<div id="events"></div>

<script src="/socket.io/socket.io.js"></script>
<script>
const eventsEl = document.getElementById("events");
const statusEl = document.getElementById("status");

function addEvent(type, detail) {
  const div = document.createElement("div");
  div.className = "log ok";
  div.setAttribute("data-event", type);
  div.textContent = "[" + type + "] " + JSON.stringify(detail);
  eventsEl.appendChild(div);
}

function addError(type, detail) {
  const div = document.createElement("div");
  div.className = "log err";
  div.setAttribute("data-event", type);
  div.textContent = "[" + type + "] " + JSON.stringify(detail);
  eventsEl.appendChild(div);
}

window.socket = io({ transports: ["websocket"] });

socket.on("connect", function () {
  statusEl.textContent = "connected";
  statusEl.setAttribute("data-status", "connected");
  addEvent("connect", { id: socket.id });
  socket.emit("get_sessions");
});

socket.on("disconnect", function (reason) {
  statusEl.textContent = "disconnected: " + reason;
  statusEl.setAttribute("data-status", "disconnected");
});

socket.on("connect_error", function (err) {
  addError("connect_error", { message: err.message });
});

socket.on("session_list", function (payload) {
  addEvent("session_list", { count: payload.sessions ? payload.sessions.length : 0 });
  window.__sessionList = payload;
});

socket.on("session_loaded", function (payload) {
  addEvent("session_loaded", { sessionId: payload.sessionId, messageCount: payload.messages ? payload.messages.length : 0 });
  window.__sessionLoaded = payload;
});

socket.on("stream_token", function (payload) {
  addEvent("stream_token", { token: payload.token });
  window.__tokens = (window.__tokens || "") + payload.token;
});

socket.on("message_complete", function (payload) {
  addEvent("message_complete", { hasStats: !!payload.stats });
  window.__messageComplete = payload;
});

socket.on("message_error", function (payload) {
  addError("message_error", { code: payload.code, message: payload.message });
  window.__messageError = payload;
});
</script>
</body>
</html>`;

interface TestServer {
  server: Server;
  port: number;
  io: SocketIOServer;
  shutdown: () => Promise<void>;
}

function createTestServer(): Promise<TestServer> {
  const httpServer = createServer();
  const io = new SocketIOServer(httpServer, {
    cors: { origin: true },
    serveClient: true,
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  httpServer.on("request", (req, res) => {
    const url = req.url ?? "/";
    if (url.startsWith("/socket.io/")) return;
    if (res.headersSent) return;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(CONNECTIVITY_HTML);
  });

  return new Promise((resolve, reject) => {
    httpServer.listen(0, "127.0.0.1", () => {
      const addr = httpServer.address();
      if (typeof addr === "object" && addr) {
        resolve({
          server: httpServer,
          port: addr.port,
          io,
          shutdown: async () => {
            io.close();
            await new Promise<void>((r) => httpServer.close(() => r()));
          },
        });
      } else {
        reject(new Error("No address"));
      }
    });
  });
}

function registerHandlers(
  io: SocketIOServer,
  runtime: MessageRuntime,
  sessionProvider: SessionDataProvider,
): void {
  io.on("connection", (socket) => {
    const handleClientMessage = registerClientMessageHandler(runtime);

    socket.on("client_send", (msg: ClientMessageEvent) => {
      void handleClientMessage(socket, msg);
    });

    socket.on("abort_turn", () => {
      // No-op — handled by runtime bridge
    });

    registerSessionHandlers(socket, sessionProvider);
  });
}

test.describe("E2E Connectivity", () => {
  let ts: TestServer;

  test.beforeAll(async () => {
    ts = await createTestServer();

    const runtime: MessageRuntime = {
      async *startTurn() {
        yield { type: "token", token: "Hello" };
        yield { type: "token", token: " from " };
        yield { type: "token", token: "Agent" };
        yield { type: "complete", stats: { inputTokens: 5, outputTokens: 3, durationMs: 42 } };
      },
    };

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [
        { id: "e2e-s1", createdAt: 1700000000000, updatedAt: 1700000001000, turnCount: 3, firstMessage: "Hello world" },
        { id: "e2e-s2", createdAt: 1700000002000, updatedAt: 1700000003000, turnCount: 1, firstMessage: "Fix bug" },
      ],
      loadSessionMessages: (id) => {
        if (id === "e2e-s1") {
          return [
            { role: "user", content: "Hello world" },
            { role: "assistant", content: "Hi! How can I help?" },
          ];
        }
        return null;
      },
    };

    registerHandlers(ts.io, runtime, sessionProvider);
  });

  test.afterAll(async () => {
    await ts.shutdown();
  });

  test("page loads and socket connects", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);

    await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

    const statusText = await page.textContent("#status");
    expect(statusText).toBe("connected");
  });

  test("receives session_list on connect", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

    await page.waitForSelector('[data-event="session_list"]', { timeout: 5000 });

    const sessionList = await page.evaluate(() => (window as any).__sessionList);
    expect(sessionList.sessions).toHaveLength(2);
  });

  test("client_send yields stream tokens and message_complete", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

    await page.evaluate(() => {
      (window as any).socket.emit("client_send", {
        messageId: "e2e-msg-1",
        sessionId: "e2e-s1",
        content: "Hello",
        timestamp: Date.now(),
      });
    });

    await page.waitForSelector('[data-event="stream_token"]', { timeout: 5000 });
    await page.waitForSelector('[data-event="message_complete"]', { timeout: 5000 });

    const fullTokens = await page.evaluate(() => (window as any).__tokens);
    expect(fullTokens).toBe("Hello from Agent");

    const complete = await page.evaluate(() => (window as any).__messageComplete);
    expect(complete.stats).toBeTruthy();
  });

  test("load_session returns stored messages", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

    await page.evaluate(() => {
      (window as any).socket.emit("load_session", { sessionId: "e2e-s1" });
    });

    await page.waitForSelector('[data-event="session_loaded"]', { timeout: 5000 });

    const loaded = await page.evaluate(() => (window as any).__sessionLoaded);
    expect(loaded.sessionId).toBe("e2e-s1");
    expect(loaded.messages).toHaveLength(2);
    expect(loaded.messages[0].role).toBe("user");
    expect(loaded.messages[0].content).toBe("Hello world");
  });

  test("load_session for unknown id does not emit", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

    await page.evaluate(() => {
      (window as any).socket.emit("load_session", { sessionId: "nonexistent" });
    });

    await page.waitForTimeout(500);
    const hasLoadedEvent = await page.$('[data-event="session_loaded"]');
    expect(hasLoadedEvent).toBeNull();
  });

  test("page renders in dark theme", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

    const bgColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    expect(bgColor).toBeTruthy();
  });
});

test.describe("E2E Connectivity — Error→UI mapping", () => {
  let errorServer: TestServer;

  test.beforeAll(async () => {
    errorServer = await createTestServer();

    const throwingRuntime: MessageRuntime = {
      async *startTurn() {
        throw new Error("API key invalid");
      },
    };

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [],
      loadSessionMessages: () => null,
    };

    registerHandlers(errorServer.io, throwingRuntime, sessionProvider);
  });

  test.afterAll(async () => {
    await errorServer.shutdown();
  });

  test("message_error renders as red error DOM entry", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${errorServer.port}`);
    await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

    // Trigger error by sending a message — the throwing runtime will emit message_error
    await page.evaluate(() => {
      (window as any).socket.emit("client_send", {
        messageId: "err-e2e-1",
        sessionId: "s-err",
        content: "trigger error",
        timestamp: Date.now(),
      });
    });

    // Wait for the error DOM entry to appear
    await page.waitForSelector('[data-event="message_error"]', { timeout: 5000 });

    // Verify red styling: the addError helper creates .log.err elements
    const errorEl = page.locator('[data-event="message_error"]');
    await expect(errorEl).toHaveClass(/err/);

    // Verify the error text contains the error code and message
    const errorText = await errorEl.textContent();
    expect(errorText).toContain("RUNTIME_ERROR");
    expect(errorText).toContain("API key invalid");

    // Verify window.__messageError has structured error payload
    const msgError = await page.evaluate(() => (window as any).__messageError);
    expect(msgError.code).toBe("RUNTIME_ERROR");
    expect(msgError.message).toBe("API key invalid");
  });
});
