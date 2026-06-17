import { describe, expect, it } from "vitest";
import {
  createRepoMap,
  createIndexedFile,
  createCodeSymbol,
  createQuery,
  createEmptyResult,
  createDiagnostic,
  type RepoMap,
  type IndexedFile,
  type CodeSymbol,
  type RepoMapQuery,
  type RepoMapResult,
  type RepoMapDiagnostic,
} from "../../src/repo-map/types";

describe("RepoMap contracts", () => {
  describe("createRepoMap", () => {
    it("creates a repo map with required fields", () => {
      const map = createRepoMap({ rootPath: "/workspace" });
      expect(map.rootPath).toBe("/workspace");
      expect(map.files).toEqual([]);
      expect(map.symbolTable).toEqual({});
      expect(map.importGraph).toEqual({});
      expect(map.diagnostics).toEqual([]);
      expect(map.updatedAt).toBeGreaterThan(0);
    });

    it("accepts optional prebuilt entries", () => {
      const file = createIndexedFile({ path: "src/a.ts" });
      const map = createRepoMap({
        rootPath: "/workspace",
        files: [file],
        updatedAt: 1000,
      });
      expect(map.files).toHaveLength(1);
      expect(map.files[0].path).toBe("src/a.ts");
      expect(map.updatedAt).toBe(1000);
    });
  });

  describe("createIndexedFile", () => {
    it("creates an indexed file with minimal fields", () => {
      const file = createIndexedFile({ path: "src/app.ts" });
      expect(file.path).toBe("src/app.ts");
      expect(file.language).toBe("unknown");
      expect(file.size).toBe(0);
      expect(file.mtime).toBeGreaterThan(0);
      expect(file.imports).toEqual([]);
      expect(file.exports).toEqual([]);
      expect(file.symbols).toEqual([]);
      expect(file.summary).toBe("");
    });

    it("accepts all optional fields", () => {
      const sym = createCodeSymbol({ name: "App", kind: "class", path: "src/app.ts" });
      const file = createIndexedFile({
        path: "src/app.ts",
        language: "typescript",
        size: 2048,
        mtime: 1718000000000,
        imports: ["react", "./utils"],
        exports: ["App"],
        symbols: [sym],
        summary: "Main application component",
      });
      expect(file.language).toBe("typescript");
      expect(file.size).toBe(2048);
      expect(file.mtime).toBe(1718000000000);
      expect(file.imports).toEqual(["react", "./utils"]);
      expect(file.exports).toEqual(["App"]);
      expect(file.symbols).toHaveLength(1);
      expect(file.summary).toBe("Main application component");
    });
  });

  describe("createCodeSymbol", () => {
    it("creates a code symbol", () => {
      const sym = createCodeSymbol({
        name: "MyService",
        kind: "class",
        path: "src/service.ts",
        line: 42,
      });
      expect(sym.name).toBe("MyService");
      expect(sym.kind).toBe("class");
      expect(sym.path).toBe("src/service.ts");
      expect(sym.line).toBe(42);
    });

    it("line defaults to 0 when omitted", () => {
      const sym = createCodeSymbol({
        name: "helper",
        kind: "function",
        path: "src/helpers.ts",
      });
      expect(sym.line).toBe(0);
    });
  });

  describe("createQuery", () => {
    it("creates a query with text only", () => {
      const q = createQuery({ text: "App" });
      expect(q.text).toBe("App");
      expect(q.language).toBeUndefined();
      expect(q.pathPrefix).toBeUndefined();
      expect(q.symbolKind).toBeUndefined();
    });

    it("creates a query with all filters", () => {
      const q = createQuery({
        text: "login",
        language: "typescript",
        pathPrefix: "src/auth/",
        symbolKind: "function",
      });
      expect(q.text).toBe("login");
      expect(q.language).toBe("typescript");
      expect(q.pathPrefix).toBe("src/auth/");
      expect(q.symbolKind).toBe("function");
    });
  });

  describe("createEmptyResult", () => {
    it("returns an empty result with no items", () => {
      const result = createEmptyResult("nonexistent");
      expect(result.query).toBe("nonexistent");
      expect(result.files).toEqual([]);
      expect(result.symbols).toEqual([]);
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("createDiagnostic", () => {
    it("creates a skip diagnostic", () => {
      const d = createDiagnostic({
        filePath: "node_modules/foo/index.js",
        reason: "ignored-directory",
        message: 'Skipped: matches ignore pattern "node_modules/**"',
      });
      expect(d.filePath).toBe("node_modules/foo/index.js");
      expect(d.reason).toBe("ignored-directory");
      expect(d.message).toContain("Skipped");
    });

    it("creates a too-large diagnostic", () => {
      const d = createDiagnostic({
        filePath: "huge.json",
        reason: "too-large",
        message: 'Skipped: exceeds size limit (2 MB)',
      });
      expect(d.reason).toBe("too-large");
    });

    it("creates a read-error diagnostic", () => {
      const d = createDiagnostic({
        filePath: "corrupt.ts",
        reason: "read-error",
        message: "Skipped: permission denied",
      });
      expect(d.reason).toBe("read-error");
    });
  });

  describe("type shapes (snapshot)", () => {
    it("RepoMap shape is stable", () => {
      const map: RepoMap = {
        rootPath: "/proj",
        files: [],
        symbolTable: {},
        importGraph: {},
        diagnostics: [],
        updatedAt: 1,
      };
      expect(Object.keys(map).sort()).toEqual([
        "diagnostics",
        "files",
        "importGraph",
        "rootPath",
        "symbolTable",
        "updatedAt",
      ]);
    });

    it("IndexedFile shape is stable", () => {
      const file: IndexedFile = {
        path: "a.ts",
        language: "typescript",
        size: 100,
        mtime: 1,
        imports: [],
        exports: [],
        symbols: [],
        summary: "ok",
      };
      expect(Object.keys(file).sort()).toEqual([
        "exports",
        "imports",
        "language",
        "mtime",
        "path",
        "size",
        "summary",
        "symbols",
      ]);
    });

    it("CodeSymbol shape is stable", () => {
      const sym: CodeSymbol = {
        name: "X",
        kind: "class",
        path: "x.ts",
        line: 1,
      };
      expect(Object.keys(sym).sort()).toEqual([
        "kind",
        "line",
        "name",
        "path",
      ]);
    });

    it("RepoMapResult shape is stable", () => {
      const result: RepoMapResult = {
        query: "q",
        files: [],
        symbols: [],
        isEmpty: true,
      };
      expect(Object.keys(result).sort()).toEqual([
        "files",
        "isEmpty",
        "query",
        "symbols",
      ]);
    });

    it("RepoMapDiagnostic shape is stable", () => {
      const d: RepoMapDiagnostic = {
        filePath: "f",
        reason: "too-large",
        message: "msg",
      };
      expect(Object.keys(d).sort()).toEqual([
        "filePath",
        "message",
        "reason",
      ]);
    });
  });
});
