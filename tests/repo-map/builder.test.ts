import { describe, expect, it } from "vitest";
import { buildRepoMap } from "../../src/repo-map/builder";
import { collectFiles } from "../../src/repo-map/collector";
import { createIgnoreOptions } from "../../src/repo-map/ignore";
import { createRepoMap } from "../../src/repo-map/types";
import type { RepoMap } from "../../src/repo-map/types";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

function makeFixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-builder-"));
  for (const [relPath, content] of Object.entries(files)) {
    const full = path.join(root, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
  }
  return root;
}

describe("builder: RepoMap construction (T017)", () => {
  it("builds a RepoMap from collected files", () => {
    const root = makeFixture({
      "src/app.ts": "export function main() {}",
      "src/lib.ts": "export const VERSION = 1;",
    });

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions() });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      expect(repoMap.rootPath).toBe(path.resolve(root));
      expect(repoMap.files).toHaveLength(2);
      expect(repoMap.files.map((f) => f.path)).toEqual(["src/app.ts", "src/lib.ts"]);
      expect(repoMap.updatedAt).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("produces IndexedFile entries with extraction data", () => {
    const root = makeFixture({
      "src/calc.ts": `
        import { sum } from "./math";
        export function add(a: number, b: number): number {
          return a + b;
        }
      `,
    });

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions() });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      const calc = repoMap.files[0];
      expect(calc.path).toBe("src/calc.ts");
      expect(calc.language).toBe("typescript");
      expect(calc.imports).toContain("./math");
      expect(calc.exports).toContain("add");
      expect(calc.symbols.some((s) => s.name === "add")).toBe(true);
      expect(calc.summary.length).toBeGreaterThan(0);
      expect(calc.size).toBeGreaterThan(0);
      expect(calc.mtime).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns empty files array for empty directory", () => {
    const root = makeFixture({});

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions() });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      expect(repoMap.files).toEqual([]);
      expect(repoMap.symbolTable).toEqual({});
      expect(repoMap.importGraph).toEqual({});
      expect(repoMap.diagnostics).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("builder: diagnostic aggregation (T018)", () => {
  it("aggregates diagnostics from collector", () => {
    const root = makeFixture({
      "src/app.ts": "export const x = 1;",
      ".env": "SECRET=xxx",
    });

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions() });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      // .env should be in diagnostics
      const secrets = repoMap.diagnostics.filter((d) => d.reason === "ignored-secret");
      expect(secrets.length).toBeGreaterThanOrEqual(1);
      // src/app.ts should still be indexed
      expect(repoMap.files.some((f) => f.path === "src/app.ts")).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("includes read-error diagnostics for unreadable files", () => {
    const root = makeFixture({
      "good.ts": "export const x = 1;",
    });

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions() });
      // Inject a non-existent file path to trigger read error
      const fakeFile = {
        path: "missing.ts",
        absolutePath: path.join(root, "missing.ts"),
        size: 100,
        mtime: Date.now(),
      };
      const repoMap = buildRepoMap(root, [...collected.files, fakeFile], collected.diagnostics);

      const readErrors = repoMap.diagnostics.filter((d) => d.reason === "read-error");
      expect(readErrors.length).toBeGreaterThanOrEqual(1);
      expect(readErrors[0].filePath).toContain("missing.ts");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("builder: symbol table (T019)", () => {
  it("builds symbol table keyed by symbol name", () => {
    const root = makeFixture({
      "src/one.ts": "export function alpha() {}",
      "src/two.ts": "export function alpha() {}",
    });

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions() });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      // "alpha" appears in both files
      expect(repoMap.symbolTable["alpha"]).toBeDefined();
      expect(repoMap.symbolTable["alpha"]).toHaveLength(2);
      const paths = repoMap.symbolTable["alpha"].map((s) => s.path);
      expect(paths).toEqual(
        expect.arrayContaining(["src/one.ts", "src/two.ts"]),
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("includes all symbol kinds in symbol table", () => {
    const root = makeFixture({
      "src/mixed.ts": `
        export function runner() {}
        export class Factory {}
        export const LIMIT = 10;
        export type ID = string;
      `,
    });

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions() });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      expect(repoMap.symbolTable["runner"]).toBeDefined();
      expect(repoMap.symbolTable["Factory"]).toBeDefined();
      expect(repoMap.symbolTable["LIMIT"]).toBeDefined();
      expect(repoMap.symbolTable["ID"]).toBeDefined();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns empty symbol table when no symbols found", () => {
    const root = makeFixture({
      "README.md": "# Project",
    });

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions(), maxFiles: 10 });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      expect(repoMap.symbolTable).toEqual({});
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("builder: import graph (T020)", () => {
  it("builds import graph keyed by file path", () => {
    const root = makeFixture({
      "src/app.ts": `
        import { helper } from "./lib";
        import { config } from "../config";
      `,
      "src/lib.ts": "export function helper() {}",
      "config.ts": "export const config = {};",
    });

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions(), maxFiles: 10 });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      const appImports = repoMap.importGraph["src/app.ts"];
      expect(appImports).toBeDefined();
      expect(appImports).toEqual(
        expect.arrayContaining(["./lib", "../config"]),
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns empty import graph for files without imports", () => {
    const root = makeFixture({
      "src/standalone.ts": "export const x = 1;",
    });

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions() });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      // standalone.ts has no imports, should not be a key in importGraph
      expect(repoMap.importGraph["src/standalone.ts"]).toBeUndefined();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
