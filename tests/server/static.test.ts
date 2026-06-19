import http from "node:http";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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

  it("rejects static paths outside the configured root", async () => {
    const parent = mkdtempSync(join(tmpdir(), "superagent-static-parent-"));
    const root = join(parent, "public");
    mkdirSync(root);
    writeFileSync(join(parent, "secret.txt"), "secret");
    const server = new WebServer({ port: 0, staticRoot: root });
    const result = await server.start();

    try {
      const response = await requestRaw(result.port, "/..%2fsecret.txt");
      expect(response.status).toBe(403);
      expect(JSON.parse(response.body).error.code).toBe("FORBIDDEN");
    } finally {
      await server.shutdown();
    }
  });
});

async function requestRaw(port: number, path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });
}
