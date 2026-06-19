import http from "node:http";
import { describe, expect, it } from "vitest";
import { WebServer } from "../../src/server/index";

async function occupyPort(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = http.createServer((_req, res) => res.end("occupied"));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server not listening");
  return {
    port: address.port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function getJson(port: number, path: string, init?: RequestInit) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, init);
  return { status: response.status, body: await response.json() };
}

describe("WebServer", () => {
  it("starts on the next port when the preferred port is occupied", async () => {
    const occupied = await occupyPort();
    const server = new WebServer({ port: occupied.port, maxPortAttempts: 10 });

    try {
      const result = await server.start();
      expect(result.host).toBe("127.0.0.1");
      expect(result.port).toBeGreaterThan(occupied.port);
      expect(result.url).toBe(`http://localhost:${result.port}`);
    } finally {
      await server.shutdown();
      await occupied.close();
    }
  });

  it("serves health checks and shuts down", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const response = await getJson(result.port, "/api/health");
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
    } finally {
      await server.shutdown();
    }
  });

  it("rejects cross-origin requests", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const response = await getJson(result.port, "/api/health", {
        headers: { Origin: "http://example.com" },
      });
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    } finally {
      await server.shutdown();
    }
  });

  it("allows localhost same-origin requests", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const localhost = await getJson(result.port, "/api/health", {
        headers: { Origin: `http://localhost:${result.port}` },
      });
      const loopback = await getJson(result.port, "/api/health", {
        headers: { Origin: `http://127.0.0.1:${result.port}` },
      });
      expect(localhost.status).toBe(200);
      expect(loopback.status).toBe(200);
    } finally {
      await server.shutdown();
    }
  });

  it("rejects requests over the body size limit", async () => {
    const server = new WebServer({ port: 0, bodyLimitBytes: 4 });
    const result = await server.start();

    try {
      const response = await getJson(result.port, "/api/health", {
        method: "POST",
        body: "12345",
        headers: { "content-length": "5" },
      });
      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    } finally {
      await server.shutdown();
    }
  });

  it("returns standard JSON for missing routes", async () => {
    const server = new WebServer({ port: 0 });
    const result = await server.start();

    try {
      const response = await getJson(result.port, "/missing");
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    } finally {
      await server.shutdown();
    }
  });

  it("supports custom routes and exposes the native HTTP server", async () => {
    const server = new WebServer({ port: 0 });
    server.use("/custom", (_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });

    const result = await server.start();

    try {
      expect(server.getHttpServer().listening).toBe(true);
      const response = await getJson(result.port, "/custom");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    } finally {
      await server.shutdown();
    }
  });
});
