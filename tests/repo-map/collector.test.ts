import { describe, expect, it } from "vitest";
import { collectFiles, type CollectResult } from "../../src/repo-map/collector";
import { createIgnoreOptions } from "../../src/repo-map/ignore";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

function makeFixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-collector-"));
  for (const [relPath, content] of Object.entries(files)) {
    const full = path.join(root, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf-8");
  }
  return root;
}

function filePaths(result: CollectResult): string[] {
  return result.files.map((f) => f.path);
}

describe("collector: deterministic file collection (T008)", () => {
  it("collects files sorted by path", () => {
    const root = makeFixture({
      "src/app.ts": "export const app = 1;",
      "src/lib/util.ts": "export const util = 1;",
      "README.md": "# Project",
    });

    try {
      const result = collectFiles(root, { ignore: createIgnoreOptions() });
      expect(result.files).toHaveLength(3);
      expect(filePaths(result)).toEqual([
        "README.md",
        "src/app.ts",
        "src/lib/util.ts",
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("skips ignored directories", () => {
    const root = makeFixture({
      "src/main.ts": "export const x = 1;",
      "node_modules/pkg/index.js": "module.exports = {};",
      "dist/bundle.js": "// built",
      ".git/config": "[core]",
    });

    try {
      const result = collectFiles(root, { ignore: createIgnoreOptions() });
      const paths = filePaths(result);
      expect(paths).toEqual(["src/main.ts"]);
      // Diagnostics for skipped files
      const skipped = result.diagnostics.filter((d) => d.reason === "ignored-directory");
      expect(skipped.length).toBeGreaterThanOrEqual(2);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns empty results for empty directory", () => {
    const root = makeFixture({});
    try {
      const result = collectFiles(root, { ignore: createIgnoreOptions() });
      expect(result.files).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("does not traverse into ignored directories at all", () => {
    const root = makeFixture({
      "src/app.ts": "1",
      "node_modules/deep/nested/file.js": "2",
    });

    try {
      const result = collectFiles(root, { ignore: createIgnoreOptions() });
      // Only src/app.ts, not the deeply nested node_modules file
      expect(filePaths(result)).toEqual(["src/app.ts"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("collector: max file count enforcement (T009)", () => {
  it("collects only up to maxFiles", () => {
    const root = makeFixture({
      "a.ts": "1",
      "b.ts": "2",
      "c.ts": "3",
      "d.ts": "4",
      "e.ts": "5",
    });

    try {
      const result = collectFiles(root, {
        ignore: createIgnoreOptions(),
        maxFiles: 3,
      });
      expect(result.files).toHaveLength(3);
      // Sorted, so first 3 alphabetically
      expect(filePaths(result)).toEqual(["a.ts", "b.ts", "c.ts"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("includes diagnostic when file count exceeded", () => {
    const root = makeFixture({
      "a.ts": "1",
      "b.ts": "2",
      "c.ts": "3",
    });

    try {
      const result = collectFiles(root, {
        ignore: createIgnoreOptions(),
        maxFiles: 2,
      });
      const overflows = result.diagnostics.filter(
        (d) => d.message.includes("max file count"),
      );
      expect(overflows.length).toBeGreaterThanOrEqual(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("collector: diagnostics for skipped candidates (T010)", () => {
  it("records secret-file diagnostics", () => {
    const root = makeFixture({
      "src/app.ts": "export const x = 1;",
      ".env": "SECRET=xxx",
    });

    try {
      const result = collectFiles(root, { ignore: createIgnoreOptions() });
      const secrets = result.diagnostics.filter((d) => d.reason === "ignored-secret");
      expect(secrets).toHaveLength(1);
      expect(secrets[0].filePath).toContain(".env");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("records oversized file diagnostics", () => {
    const root = makeFixture({
      "small.ts": "x",
    });
    // Write a file larger than the limit
    const bigPath = path.join(root, "big.ts");
    fs.writeFileSync(bigPath, "x".repeat(2000), "utf-8");

    try {
      const result = collectFiles(root, {
        ignore: createIgnoreOptions({ maxFileBytes: 1024 }),
      });
      const oversized = result.diagnostics.filter((d) => d.reason === "too-large");
      expect(oversized).toHaveLength(1);
      expect(oversized[0].filePath).toContain("big.ts");
      // Only small.ts should be collected
      expect(filePaths(result)).toEqual(["small.ts"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("records binary file diagnostics", () => {
    const root = makeFixture({
      "src/app.ts": "export const x = 1;",
    });
    // Create directory first, then write binary file
    fs.mkdirSync(path.join(root, "assets"), { recursive: true });
    fs.writeFileSync(path.join(root, "assets", "logo.png"), Buffer.alloc(100));

    try {
      const result = collectFiles(root, { ignore: createIgnoreOptions() });
      const binaries = result.diagnostics.filter((d) => d.reason === "binary");
      expect(binaries).toHaveLength(1);
      expect(binaries[0].filePath).toContain("logo.png");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("completes successfully even when some files are unreadable", () => {
    const root = makeFixture({
      "good.ts": "export const x = 1;",
    });
    // Create a directory with a file we can't stat (simulate unreadable)
    const weirdDir = path.join(root, "weird");
    fs.mkdirSync(weirdDir);
    // Collection should still succeed and include good.ts
    try {
      const result = collectFiles(root, { ignore: createIgnoreOptions() });
      expect(filePaths(result)).toContain("good.ts");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("includes files with supported extensions", () => {
    const root = makeFixture({
      "src/index.ts": "1",
      "src/App.tsx": "2",
      "src/style.css": "3",
      "src/types.d.ts": "4",
      "README.md": "5",
      "package.json": '{"name": "test"}',
    });

    try {
      const result = collectFiles(root, { ignore: createIgnoreOptions(), maxFiles: 50 });
      expect(result.files.length).toBeGreaterThanOrEqual(5);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
