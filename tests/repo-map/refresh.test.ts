import { describe, expect, it } from "vitest";
import { refreshRepoMap } from "../../src/repo-map/refresh";
import { buildRepoMap } from "../../src/repo-map/builder";
import { collectFiles } from "../../src/repo-map/collector";
import { createIgnoreOptions } from "../../src/repo-map/ignore";
import type { RepoMap } from "../../src/repo-map/types";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

function makeRepoMap(files: Record<string, string>): { repoMap: RepoMap; root: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-refresh-"));
  for (const [relPath, content] of Object.entries(files)) {
    const full = path.join(root, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
  }
  const collected = collectFiles(root, { ignore: createIgnoreOptions(), maxFiles: 50 });
  const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);
  return { repoMap, root };
}

describe("refresh: changed-file detection (T028)", () => {
  it("updates a file whose content changed", () => {
    const { repoMap, root } = makeRepoMap({
      "src/app.ts": "export const OLD = 1;",
    });

    try {
      // Modify the file
      fs.writeFileSync(path.join(root, "src/app.ts"), "export const NEW = 2;", "utf-8");

      const refreshed = refreshRepoMap(repoMap, root, { ignore: createIgnoreOptions() });

      const app = refreshed.files.find((f) => f.path === "src/app.ts");
      expect(app).toBeDefined();
      expect(app!.exports).toContain("NEW");
      expect(app!.exports).not.toContain("OLD");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("preserves unchanged files", () => {
    const { repoMap, root } = makeRepoMap({
      "src/a.ts": "export const A = 1;",
      "src/b.ts": "export const B = 2;",
    });

    try {
      // Modify only a.ts
      fs.writeFileSync(path.join(root, "src/a.ts"), "export const A_V2 = 1;", "utf-8");

      const refreshed = refreshRepoMap(repoMap, root, { ignore: createIgnoreOptions() });

      // b.ts should still be there
      expect(refreshed.files.some((f) => f.path === "src/b.ts")).toBe(true);
      // a.ts should be updated
      const a = refreshed.files.find((f) => f.path === "src/a.ts");
      expect(a!.exports).toContain("A_V2");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("updates symbol table after refresh", () => {
    const { repoMap, root } = makeRepoMap({
      "src/lib.ts": "export function oldName() {}",
    });

    try {
      fs.writeFileSync(path.join(root, "src/lib.ts"), "export function newName() {}", "utf-8");

      const refreshed = refreshRepoMap(repoMap, root, { ignore: createIgnoreOptions() });

      expect(refreshed.symbolTable["oldName"]).toBeUndefined();
      expect(refreshed.symbolTable["newName"]).toBeDefined();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("refresh: added-file detection (T029)", () => {
  it("adds newly created files", () => {
    const { repoMap, root } = makeRepoMap({
      "src/existing.ts": "export const x = 1;",
    });

    try {
      fs.mkdirSync(path.join(root, "src"), { recursive: true });
      fs.writeFileSync(path.join(root, "src", "newfile.ts"), "export const newThing = 42;", "utf-8");

      const refreshed = refreshRepoMap(repoMap, root, { ignore: createIgnoreOptions() });

      expect(refreshed.files.some((f) => f.path === "src/newfile.ts")).toBe(true);
      expect(refreshed.files.length).toBeGreaterThanOrEqual(2);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("respects ignore rules for new files", () => {
    const { repoMap, root } = makeRepoMap({
      "src/main.ts": "export const x = 1;",
    });

    try {
      // Create a node_modules file that should be ignored
      const nmDir = path.join(root, "node_modules", "pkg");
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, "index.js"), "module.exports = {};", "utf-8");

      const refreshed = refreshRepoMap(repoMap, root, { ignore: createIgnoreOptions() });

      expect(refreshed.files.some((f) => f.path.includes("node_modules"))).toBe(false);
      expect(refreshed.files.length).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("refresh: deleted-file detection (T030)", () => {
  it("removes deleted files from the repo map", () => {
    const { repoMap, root } = makeRepoMap({
      "src/stay.ts": "export const stay = 1;",
      "src/go.ts": "export const go = 2;",
    });

    try {
      fs.unlinkSync(path.join(root, "src", "go.ts"));

      const refreshed = refreshRepoMap(repoMap, root, { ignore: createIgnoreOptions() });

      expect(refreshed.files.some((f) => f.path === "src/stay.ts")).toBe(true);
      expect(refreshed.files.some((f) => f.path === "src/go.ts")).toBe(false);
      expect(refreshed.files.length).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("cleans up symbol table for deleted files", () => {
    const { repoMap, root } = makeRepoMap({
      "src/lib.ts": "export function deleteMe() {}",
      "src/other.ts": "export const keeper = 1;",
    });

    try {
      fs.unlinkSync(path.join(root, "src", "lib.ts"));

      const refreshed = refreshRepoMap(repoMap, root, { ignore: createIgnoreOptions() });

      // deleteMe symbol should be gone
      const deleteMeSyms = refreshed.symbolTable["deleteMe"] ?? [];
      expect(deleteMeSyms.every((s) => s.path !== "src/lib.ts")).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("cleans up import graph for deleted files", () => {
    const { repoMap, root } = makeRepoMap({
      "src/consumer.ts": `import { thing } from "./provider";`,
      "src/provider.ts": "export const thing = 1;",
    });

    try {
      fs.unlinkSync(path.join(root, "src", "consumer.ts"));

      const refreshed = refreshRepoMap(repoMap, root, { ignore: createIgnoreOptions() });

      expect(refreshed.importGraph["src/consumer.ts"]).toBeUndefined();
      expect(refreshed.importGraph["src/provider.ts"]).toBeUndefined(); // provider has no imports
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
