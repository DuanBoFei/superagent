import { describe, expect, it } from "vitest";
import { WebServer } from "../../src/server/index";

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
