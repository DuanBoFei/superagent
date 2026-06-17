import { describe, expect, it } from "vitest";
import { searchRepoMap } from "../../src/repo-map/search";
import { buildRepoMap } from "../../src/repo-map/builder";
import { collectFiles } from "../../src/repo-map/collector";
import { createIgnoreOptions } from "../../src/repo-map/ignore";
import { createQuery, createEmptyResult, type RepoMap } from "../../src/repo-map/types";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

function makeRepoMap(files: Record<string, string>): RepoMap {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-search-"));
  for (const [relPath, content] of Object.entries(files)) {
    const full = path.join(root, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
  }
  const collected = collectFiles(root, { ignore: createIgnoreOptions(), maxFiles: 50 });
  const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

  // Cleanup after building
  fs.rmSync(root, { recursive: true, force: true });
  return repoMap;
}

describe("search: exact symbol ranking (T021)", () => {
  it("ranks exact exported symbol match highest", () => {
    const repoMap = makeRepoMap({
      "src/auth.ts": "export function authenticate() {}",
      "src/unrelated.ts": "export const x = 1;",
    });

    const result = searchRepoMap(repoMap, createQuery({ text: "authenticate" }));

    expect(result.isEmpty).toBe(false);
    expect(result.files[0].path).toBe("src/auth.ts");
    expect(result.symbols.some((s) => s.name === "authenticate")).toBe(true);
  });

  it("ranks exact top-level symbol match", () => {
    const repoMap = makeRepoMap({
      "src/helper.ts": "function parseInput() {}",
      "src/other.ts": "const unused = 1;",
    });

    const result = searchRepoMap(repoMap, createQuery({ text: "parseInput" }));

    expect(result.isEmpty).toBe(false);
    expect(result.files[0].path).toBe("src/helper.ts");
  });

  it("finds symbols by kind filter", () => {
    const repoMap = makeRepoMap({
      "src/types.ts": "export type UserId = string;\nexport const MAX = 100;",
    });

    const result = searchRepoMap(
      repoMap,
      createQuery({ text: "UserId", symbolKind: "type" }),
    );

    const matching = result.symbols.filter((s) => s.name === "UserId");
    expect(matching).toHaveLength(1);
    expect(matching[0].kind).toBe("type");
  });
});

describe("search: basename and path ranking (T022)", () => {
  it("matches file basename against query", () => {
    const repoMap = makeRepoMap({
      "src/components/Button.tsx": "export const Button = () => null;",
      "src/utils/math.ts": "export const PI = 3.14;",
    });

    const result = searchRepoMap(repoMap, createQuery({ text: "Button" }));

    // Button matches basename "Button" and symbol "Button"
    expect(result.files.some((f) => f.path.includes("Button"))).toBe(true);
  });

  it("matches path substring against query", () => {
    const repoMap = makeRepoMap({
      "src/api/users/controller.ts": "export class UserController {}",
      "src/graphql/schema.ts": "export const schema = {};",
    });

    const result = searchRepoMap(repoMap, createQuery({ text: "users" }));

    expect(result.files.some((f) => f.path.includes("users"))).toBe(true);
  });

  it("filters by path prefix", () => {
    const repoMap = makeRepoMap({
      "src/api/routes.ts": "export const routes = [];",
      "tests/api/routes.test.ts": "import { routes } from '../../src/api/routes';",
    });

    const result = searchRepoMap(
      repoMap,
      createQuery({ text: "routes", pathPrefix: "src/" }),
    );

    // Only src/api/routes.ts should be returned, not tests/
    const paths = result.files.map((f) => f.path);
    expect(paths.every((p) => p.startsWith("src/"))).toBe(true);
  });
});

describe("search: import and summary ranking (T023)", () => {
  it("finds files that import a matching module", () => {
    const repoMap = makeRepoMap({
      "src/consumer.ts": `import { helper } from "./lib";`,
      "src/lib.ts": "export function helper() {}",
    });

    const result = searchRepoMap(repoMap, createQuery({ text: "./lib" }));

    // consumer.ts imports ./lib, should appear in results
    expect(result.files.some((f) => f.path === "src/consumer.ts")).toBe(true);
  });

  it("finds files by summary match", () => {
    const repoMap = makeRepoMap({
      "src/README.md": "Authentication module setup instructions",
    });

    // Need to rebuild with md file support... actually md files are collected
    const result = searchRepoMap(repoMap, createQuery({ text: "Authentication" }));

    // Summary search should find the README
    expect(result.files.length).toBeGreaterThan(0);
  });
});

describe("search: empty result behavior (T024)", () => {
  it("returns empty result for no matches", () => {
    const repoMap = makeRepoMap({
      "src/app.ts": "export const x = 1;",
    });

    const result = searchRepoMap(repoMap, createQuery({ text: "nonexistent" }));

    expect(result.isEmpty).toBe(true);
    expect(result.files).toEqual([]);
    expect(result.symbols).toEqual([]);
  });

  it("returns empty result for empty repo map", () => {
    const emptyMap = makeRepoMap({});

    const result = searchRepoMap(emptyMap, createQuery({ text: "anything" }));

    expect(result.isEmpty).toBe(true);
    expect(result.files).toEqual([]);
    expect(result.symbols).toEqual([]);
  });

  it("does not fabricate file paths", () => {
    const repoMap = makeRepoMap({
      "src/real.ts": "const real = true;",
    });

    const result = searchRepoMap(repoMap, createQuery({ text: "fabricated" }));

    // Should not contain any made-up files
    expect(result.files).toHaveLength(0);
    expect(result.symbols).toHaveLength(0);
    expect(result.query).toBe("fabricated");
  });
});
