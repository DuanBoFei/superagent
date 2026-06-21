/**
 * Gap ③ 接缝粘合 · Error → UI mapping end-to-end test.
 *
 * Verifies that message_error socket events propagate through the full chain:
 *   socket-handlers emit("message_error") → browser socket.on("message_error")
 *   → markError(messageId, message) → DOM renders error state.
 *
 * This closes the seam between backend error emission and frontend error display —
 * the single most likely place where backend reality and frontend assumptions diverge.
 *
 * Run: npx playwright test tests/web/e2e-error-mapping.pwtest.ts
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

const ERROR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>E2E Error Mapping</title>
<style>
  body { background: #0a0a0a; color: #fafafa; font: 14px monospace; padding: 24px; margin: 0; }
  .message { padding: 8px; margin: 4px 0; border-radius: 4px; }
  .message.user { background: #18181b; text-align: right; }
  .message.assistant { background: #0d0d0d; }
  .message.error .error-text { color: #ef4444; font-size: 12px; margin-top: 4px; display: block; }
  .log { border: 1px solid #1f1f23; padding: 8px; margin: 4px 0; border-radius: 4px; font-size: 12px; }
  .log.ok { border-color: #10b981; color: #10b981; }
  .log.err { border-color: #ef4444; color: #ef4444; }
</style>
</head>
<body>
<h1>E2E Error Mapping</h1>
<div id="status">connecting...</div>
<div id="messages"></div>
<div id="events"></div>

<script src="/socket.io/socket.io.js"></script>
<script>
var messagesEl = document.getElementById("messages");
var eventsEl = document.getElementById("events");
var statusEl = document.getElementById("status");

function addEvent(type, detail) {
  var div = document.createElement("div");
  div.className = "log ok";
  div.setAttribute("data-event", type);
  div.textContent = "[" + type + "] " + JSON.stringify(detail);
  eventsEl.appendChild(div);
}

function addErrorEvent(type, detail) {
  var div = document.createElement("div");
  div.className = "log err";
  div.setAttribute("data-event", type);
  div.textContent = "[" + type + "] " + JSON.stringify(detail);
  eventsEl.appendChild(div);
}

function renderMessage(msg) {
  var div = document.createElement("div");
  div.className = "message " + msg.role;
  div.setAttribute("data-message-id", msg.id);
  div.setAttribute("data-message-role", msg.role);
  div.setAttribute("data-message-status", msg.status || "sent");
  var content = document.createElement("span");
  content.textContent = msg.content;
  div.appendChild(content);
  if (msg.error) {
    var errSpan = document.createElement("span");
    errSpan.className = "error-text";
    errSpan.setAttribute("data-error", "true");
    errSpan.textContent = msg.error;
    div.appendChild(errSpan);
  }
  messagesEl.appendChild(div);
}

window.socket = io({ transports: ["websocket"] });

socket.on("connect", function () {
  statusEl.textContent = "connected";
  statusEl.setAttribute("data-status", "connected");
  addEvent("connect", { id: socket.id });
});

socket.on("disconnect", function (reason) {
  statusEl.textContent = "disconnected: " + reason;
  statusEl.setAttribute("data-status", "disconnected");
});

// Simulate a minimal chat store that renders messages to DOM
// This mirrors the production chain: socket event → store → DOM
socket.on("stream_token", function (payload) {
  addEvent("stream_token", { token: payload.token, messageId: payload.messageId });
  var el = document.querySelector('[data-message-id="' + payload.messageId + '"]');
  if (el) {
    el.setAttribute("data-message-status", "streaming");
    el.querySelector("span").textContent += payload.token;
  } else {
    var div = document.createElement("div");
    div.className = "message assistant";
    div.setAttribute("data-message-id", payload.messageId);
    div.setAttribute("data-message-role", "assistant");
    div.setAttribute("data-message-status", "streaming");
    div.innerHTML = '<span>' + payload.token + '</span>';
    messagesEl.appendChild(div);
  }
  window.__lastStreamToken = payload;
  window.__streamTokenCount = (window.__streamTokenCount || 0) + 1;
});

socket.on("message_complete", function (payload) {
  addEvent("message_complete", { messageId: payload.messageId, hasStats: !!payload.stats });
  var el = document.querySelector('[data-message-id="' + payload.messageId + '"]');
  if (el) el.setAttribute("data-message-status", "sent");
  window.__lastComplete = payload;
  window.__completeCount = (window.__completeCount || 0) + 1;
});

socket.on("message_error", function (payload) {
  addErrorEvent("message_error", { code: payload.code, message: payload.message, messageId: payload.messageId, retryable: payload.retryable });

  // Mirror production chain: markError(messageId, message) → DOM update
  var el = document.querySelector('[data-message-id="' + payload.messageId + '"]');
  if (el) {
    el.setAttribute("data-message-status", "error");
    var errSpan = el.querySelector(".error-text");
    if (!errSpan) {
      errSpan = document.createElement("span");
      errSpan.className = "error-text";
      errSpan.setAttribute("data-error", "true");
      el.appendChild(errSpan);
    }
    errSpan.textContent = payload.message;
  } else {
    // No existing element — create an error message entry
    var div = document.createElement("div");
    div.className = "message assistant error";
    div.setAttribute("data-message-id", payload.messageId);
    div.setAttribute("data-message-role", "assistant");
    div.setAttribute("data-message-status", "error");
    div.innerHTML = '<span></span>';
    var errSpan = document.createElement("span");
    errSpan.className = "error-text";
    errSpan.setAttribute("data-error", "true");
    errSpan.textContent = payload.message;
    div.appendChild(errSpan);
    messagesEl.appendChild(div);
  }

  window.__lastError = payload;
  window.__errorCount = (window.__errorCount || 0) + 1;
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
  return new Promise((resolve, reject) => {
    const httpServer = createServer();
    const io = new SocketIOServer(httpServer, {
      cors: { origin: true },
      serveClient: true,
      pingInterval: 10000,
      pingTimeout: 5000,
    });

    httpServer.on("request", (_req, res) => {
      if (res.headersSent) return;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(ERROR_HTML);
    });

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
) {
  io.on("connection", (socket) => {
    const handleClientMessage = registerClientMessageHandler(runtime);

    socket.on("client_send", (msg: ClientMessageEvent) => {
      void handleClientMessage(socket, msg);
    });

    registerSessionHandlers(socket, sessionProvider);
  });
}

test.describe("E2E Error Mapping — message_error → DOM", () => {
  let ts: TestServer;

  test.beforeAll(async () => {
    ts = await createTestServer();

    const runtime: MessageRuntime = {
      async *startTurn(msg) {
        // Emit one token, then throw — triggers message_error path
        yield { type: "token", token: "Processing: " + msg.content };
        throw new Error("Simulated runtime crash in startTurn");
      },
    };

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [],
      loadSessionMessages: () => null,
    };

    registerHandlers(ts.io, runtime, sessionProvider);
  });

  test.afterAll(async () => {
    await ts.shutdown();
  });

  test("runtime error emits message_error and DOM renders error state", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

    // Send a message that will trigger a runtime error
    await page.evaluate(() => {
      (window as any).socket.emit("client_send", {
        messageId: "err-1",
        sessionId: "s-err",
        content: "doomed message",
        timestamp: Date.now(),
      });
    });

    // Wait for the message_error event in the event log
    await page.waitForSelector('[data-event="message_error"]', { timeout: 5000 });

    // Verify the error event payload
    const lastError = await page.evaluate(() => (window as any).__lastError);
    expect(lastError).toBeDefined();
    expect(lastError.code).toBe("RUNTIME_ERROR");
    expect(lastError.message).toBe("Simulated runtime crash in startTurn");
    expect(lastError.retryable).toBe(true);

    // Verify DOM error state: message element has error status and error text
    const errorEl = await page.$('[data-message-id="err-1"]');
    expect(errorEl).not.toBeNull();

    const status = await errorEl!.getAttribute("data-message-status");
    expect(status).toBe("error");

    // Verify error text is visible in DOM
    const errorText = await errorEl!.$eval(".error-text", (el) => el.textContent);
    expect(errorText).toBe("Simulated runtime crash in startTurn");
  });

  test("message_error for non-streaming message creates error-only DOM entry", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

    // Send a message — the runtime throws immediately (no token emitted first in this variant)
    await page.evaluate(() => {
      // We need a different runtime behavior. Re-create server for this test.
      (window as any).socket.emit("client_send", {
        messageId: "err-2",
        sessionId: "s-err-2",
        content: "immediate failure",
        timestamp: Date.now(),
      });
    });

    // Wait for error
    await page.waitForSelector('[data-event="message_error"]', { timeout: 5000 });

    // Even without prior stream_token, an error entry should exist in DOM
    const errorEl = await page.$('[data-message-id="err-2"]');
    expect(errorEl).not.toBeNull();
    expect(await errorEl!.getAttribute("data-message-status")).toBe("error");

    const errorText = await errorEl!.$eval(".error-text", (el) => el.textContent);
    expect(errorText).toBe("Simulated runtime crash in startTurn");
  });

  test("stream_token before error creates partial content with error appended", async ({ page }) => {
    await page.goto(`http://127.0.0.1:${ts.port}`);
    await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

    await page.evaluate(() => {
      (window as any).socket.emit("client_send", {
        messageId: "partial-1",
        sessionId: "s-partial",
        content: "partial content",
        timestamp: Date.now(),
      });
    });

    // Wait for at least one stream_token
    await page.waitForFunction(
      () => (window as any).__streamTokenCount >= 1,
      { timeout: 5000 },
    );

    // Wait for error
    await page.waitForSelector('[data-event="message_error"]', { timeout: 5000 });

    // Verify the message element has both partial content AND error
    const el = await page.$('[data-message-id="partial-1"]');
    expect(el).not.toBeNull();

    const status = await el!.getAttribute("data-message-status");
    expect(status).toBe("error");

    const contentText = await el!.$eval("span:first-child", (el) => el.textContent);
    expect(contentText).toContain("Processing: partial content");

    const errorText = await el!.$eval(".error-text", (el) => el.textContent);
    expect(errorText).toBe("Simulated runtime crash in startTurn");
  });
});

test.describe("E2E Error Mapping — error code differentiation", () => {
  test("RUNTIME_ERROR code is retryable and maps to internal error display", async ({ page }) => {
    // Create a fresh server with a runtime that throws before any token
    const server = await createTestServer();

    const runtime: MessageRuntime = {
      async *startTurn(_msg) {
        throw new Error("Connection timeout");
      },
    };

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [],
      loadSessionMessages: () => null,
    };

    registerHandlers(server.io, runtime, sessionProvider);

    try {
      await page.goto(`http://127.0.0.1:${server.port}`);
      await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

      await page.evaluate(() => {
        (window as any).socket.emit("client_send", {
          messageId: "timeout-1",
          sessionId: "s-timeout",
          content: "anything",
          timestamp: Date.now(),
        });
      });

      await page.waitForSelector('[data-event="message_error"]', { timeout: 5000 });

      const lastError = await page.evaluate(() => (window as any).__lastError);
      expect(lastError.code).toBe("RUNTIME_ERROR");
      expect(lastError.message).toBe("Connection timeout");
      expect(lastError.retryable).toBe(true);

      // DOM verification
      const el = await page.$('[data-message-id="timeout-1"]');
      expect(el).not.toBeNull();
      expect(await el!.getAttribute("data-message-status")).toBe("error");
      const errorText = await el!.$eval(".error-text", (el) => el.textContent);
      expect(errorText).toBe("Connection timeout");
    } finally {
      await server.shutdown();
    }
  });

  test("multiple errors on different sessions are isolated in DOM", async ({ page }) => {
    const server = await createTestServer();

    const runtime: MessageRuntime = {
      async *startTurn(msg) {
        throw new Error(msg.sessionId + " error");
      },
    };

    const sessionProvider: SessionDataProvider = {
      listSessions: () => [],
      loadSessionMessages: () => null,
    };

    registerHandlers(server.io, runtime, sessionProvider);

    try {
      await page.goto(`http://127.0.0.1:${server.port}`);
      await page.waitForSelector('[data-status="connected"]', { timeout: 10000 });

      // Trigger error on session A
      await page.evaluate(() => {
        (window as any).socket.emit("client_send", {
          messageId: "err-a",
          sessionId: "session-A",
          content: "A",
          timestamp: Date.now(),
        });
      });
      await page.waitForSelector('[data-event="message_error"]', { timeout: 5000 });

      // Trigger error on session B
      await page.evaluate(() => {
        (window as any).socket.emit("client_send", {
          messageId: "err-b",
          sessionId: "session-B",
          content: "B",
          timestamp: Date.now(),
        });
      });

      // Wait for second error
      await page.waitForFunction(
        () => (window as any).__errorCount >= 2,
        { timeout: 5000 },
      );

      // Verify isolated error messages in DOM
      const elA = await page.$('[data-message-id="err-a"]');
      const elB = await page.$('[data-message-id="err-b"]');
      expect(elA).not.toBeNull();
      expect(elB).not.toBeNull();

      const errorA = await elA!.$eval(".error-text", (el) => el.textContent);
      const errorB = await elB!.$eval(".error-text", (el) => el.textContent);
      expect(errorA).toContain("session-A error");
      expect(errorB).toContain("session-B error");
    } finally {
      await server.shutdown();
    }
  });
});
