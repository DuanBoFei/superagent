import http from "node:http";
import { describe, expect, it } from "vitest";
import { handleHealth } from "../../src/server/health";

async function request(server: http.Server, path: string) {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("server not listening");
  const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
  return { status: response.status, body: await response.json() };
}

describe("handleHealth", () => {
  it("returns status and uptime", async () => {
    const server = http.createServer((req, res) => handleHealth(req, res, Date.now() - 5));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    try {
      const response = await request(server, "/api/health");
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
