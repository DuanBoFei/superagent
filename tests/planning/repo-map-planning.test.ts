import { describe, expect, it } from "vitest";
import { queryRepoMap } from "../../src/repo-map/query";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("T038: repo-map for planner prompt", () => {
  it("queryRepoMap returns ranked results for plan context", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-plan-"));
    try {
      fs.mkdirSync(path.join(root, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(root, "src", "router.ts"),
        "export class Router {}\nexport function route() {}",
        "utf-8",
      );
      fs.writeFileSync(
        path.join(root, "src", "middleware.ts"),
        "export function authMiddleware() {}",
        "utf-8",
      );
      fs.writeFileSync(
        path.join(root, "src", "logger.ts"),
        "export function getLogger() {}",
        "utf-8",
      );

      const result = queryRepoMap({
        rootPath: root,
        query: { text: "Router" },
      });

      expect(result.files.length).toBeGreaterThan(0);
      // Exact symbol match should rank highest
      const topFile = result.files[0];
      expect(topFile.path).toContain("router.ts");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("queryRepoMap with path prefix filters by directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-plan-2-"));
    try {
      fs.mkdirSync(path.join(root, "src", "api"), { recursive: true });
      fs.mkdirSync(path.join(root, "src", "cli"), { recursive: true });
      fs.writeFileSync(
        path.join(root, "src", "api", "server.ts"),
        "export function start() {}",
        "utf-8",
      );
      fs.writeFileSync(
        path.join(root, "src", "cli", "main.ts"),
        "export function main() {}",
        "utf-8",
      );

      const result = queryRepoMap({
        rootPath: root,
        query: { text: "start", pathPrefix: "src/api" },
      });

      expect(result.files.length).toBe(1);
      expect(result.files[0].path).toContain("src/api");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
