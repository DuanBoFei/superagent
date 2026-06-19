import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WebServer } from "../../src/server/index";

describe("static file serving", () => {
  it("serves files from the configured static root", async () => {
    const root = mkdtempSync(join(tmpdir(), "superagent-static-"));
    writeFileSync(join(root, "hello.txt"), "hello static");
    const server = new WebServer({ port: 0, staticRoot: root });
    const result = await server.start();

    try {
      const response = await fetch(`http://127.0.0.1:${result.port}/hello.txt`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");
      expect(await response.text()).toBe("hello static");
    } finally {
      await server.shutdown();
    }
  });
});
