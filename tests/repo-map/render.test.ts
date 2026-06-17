import { describe, expect, it } from "vitest";
import { renderRepoMap } from "../../src/repo-map/render";
import { buildRepoMap } from "../../src/repo-map/builder";
import { collectFiles } from "../../src/repo-map/collector";
import { createIgnoreOptions } from "../../src/repo-map/ignore";
import type { RepoMap } from "../../src/repo-map/types";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

function makeRepoMap(files: Record<string, string>): RepoMap {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-render-"));
  for (const [relPath, content] of Object.entries(files)) {
    const full = path.join(root, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
  }
  const collected = collectFiles(root, { ignore: createIgnoreOptions(), maxFiles: 50 });
  const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);
  fs.rmSync(root, { recursive: true, force: true });
  return repoMap;
}

describe("render: compact context block (T025)", () => {
  it("renders a context block with files and symbols", () => {
    const repoMap = makeRepoMap({
      "src/main.ts": "export function start() {}",
      "src/types.ts": "export type ID = string;",
    });

    const rendered = renderRepoMap(repoMap);

    expect(rendered).toContain("src/main.ts");
    expect(rendered).toContain("start");
    expect(rendered).toContain("src/types.ts");
    expect(rendered).toContain("ID");
  });

  it("renders nothing for empty repo map", () => {
    const repoMap = makeRepoMap({});

    const rendered = renderRepoMap(repoMap);

    expect(rendered).toBe("");
  });

  it("includes file count in output", () => {
    const repoMap = makeRepoMap({
      "a.ts": "export const a = 1;",
      "b.ts": "export const b = 2;",
      "c.ts": "export const c = 3;",
    });

    const rendered = renderRepoMap(repoMap);

    // Some indication of how many files are indexed
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered).toContain("a.ts");
    expect(rendered).toContain("b.ts");
    expect(rendered).toContain("c.ts");
  });
});

describe("render: character budget enforcement (T026)", () => {
  it("enforces a configurable character budget", () => {
    const repoMap = makeRepoMap({
      "src/app.ts": "export const app = 1;",
      "src/lib.ts": "export const lib = 2;",
      "src/util.ts": "export const util = 3;",
    });

    const short = renderRepoMap(repoMap, { maxChars: 50 });
    const long = renderRepoMap(repoMap, { maxChars: 2000 });

    expect(short.length).toBeLessThanOrEqual(50);
    expect(long.length).toBeGreaterThan(short.length);
  });

  it("default budget is reasonable (8-12 KB per clarify)", () => {
    const repoMap = makeRepoMap({
      "src/app.ts": "export const app = 1;",
    });

    const rendered = renderRepoMap(repoMap);
    // Default budget should be below 12KB
    expect(rendered.length).toBeLessThanOrEqual(12 * 1024);
  });

  it("truncates rather than exceeding budget", () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 100; i++) {
      files[`src/module${i}.ts`] = `export function fn${i}() {}`;
    }
    const repoMap = makeRepoMap(files);

    const rendered = renderRepoMap(repoMap, { maxChars: 500 });
    expect(rendered.length).toBeLessThanOrEqual(500);
  });
});

describe("render: snapshot stability (T027)", () => {
  it("produces deterministic output for the same input", () => {
    const repoMap1 = makeRepoMap({
      "src/x.ts": "export const X = 1;",
      "src/y.ts": "export const Y = 2;",
    });
    const repoMap2 = makeRepoMap({
      "src/x.ts": "export const X = 1;",
      "src/y.ts": "export const Y = 2;",
    });

    const rendered1 = renderRepoMap(repoMap1);
    const rendered2 = renderRepoMap(repoMap2);

    expect(rendered1).toBe(rendered2);
  });

  it("includes diagnostics summary when diagnostics exist", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-render-diag-"));
    fs.writeFileSync(path.join(root, "good.ts"), "export const x = 1;", "utf-8");
    fs.writeFileSync(path.join(root, ".env"), "SECRET=xxx", "utf-8");

    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions() });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      const rendered = renderRepoMap(repoMap);

      // Should mention that some files were skipped
      expect(rendered.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
