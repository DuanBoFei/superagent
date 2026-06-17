import { describe, expect, it } from "vitest";
import { queryRepoMap } from "../../src/repo-map/query";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("T037: repo-map for Explore role", () => {
  it("queryRepoMap finds symbols for Explore agent", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-agent-"));
    try {
      fs.mkdirSync(path.join(root, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(root, "src", "auth.ts"),
        "export function login() {}\nexport function logout() {}",
        "utf-8",
      );
      fs.writeFileSync(
        path.join(root, "src", "utils.ts"),
        "export const VERSION = '1.0';\nexport function formatDate(d: Date) {}",
        "utf-8",
      );

      const result = queryRepoMap({
        rootPath: root,
        query: { text: "login" },
      });

      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files[0].path).toContain("auth.ts");
      expect(result.query).toBe("login");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("queryRepoMap returns empty for missing symbol", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-agent-empty-"));
    try {
      fs.mkdirSync(path.join(root, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(root, "src", "app.ts"),
        "export const hello = 'world';",
        "utf-8",
      );

      const result = queryRepoMap({
        rootPath: root,
        query: { text: "nonexistent" },
      });

      expect(result.files.length).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
