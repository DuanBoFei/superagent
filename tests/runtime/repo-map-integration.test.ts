import { describe, expect, it } from "vitest";
import { composePrompt } from "../../src/context/composer";
import { collectFiles } from "../../src/repo-map/collector";
import { buildRepoMap } from "../../src/repo-map/builder";
import { renderRepoMap } from "../../src/repo-map/render";
import { createIgnoreOptions } from "../../src/repo-map/ignore";
import type { PromptContext, ContextMessage } from "../../src/context/types";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("T033: repo-map in context setup", () => {
  it("composePrompt injects repoMapText into system prompt", () => {
    const messages: ContextMessage[] = [];
    const context: PromptContext = {
      rulesFilePath: "CLAUDE.md",
      toolDefinitions: [],
      contextWindowTokens: 128_000,
      currentTokens: 0,
      repoMapText: "<repo-map>\n3 files indexed\nsrc/app.ts\nexports: foo\n</repo-map>",
    };

    const prompt = composePrompt(messages, context);

    expect(prompt.system).toContain("<repo-map>");
    expect(prompt.system).toContain("3 files indexed");
    expect(prompt.system).toContain("src/app.ts");
  });

  it("composePrompt works without repoMapText (backwards compatible)", () => {
    const messages: ContextMessage[] = [];
    const context: PromptContext = {
      rulesFilePath: "CLAUDE.md",
      toolDefinitions: [],
      contextWindowTokens: 128_000,
      currentTokens: 0,
    };

    const prompt = composePrompt(messages, context);

    expect(prompt.system).toContain("You are");
    expect(prompt.system).not.toContain("<repo-map>");
  });

  it("token estimate includes repo-map content when present", () => {
    const messages: ContextMessage[] = [];
    const contextWithout: PromptContext = {
      rulesFilePath: "CLAUDE.md",
      toolDefinitions: [],
      contextWindowTokens: 128_000,
      currentTokens: 0,
    };
    const contextWith: PromptContext = {
      ...contextWithout,
      repoMapText: "<repo-map>\n100 files indexed\n</repo-map>",
    };

    const without = composePrompt(messages, contextWithout);
    const withMap = composePrompt(messages, contextWith);

    expect(withMap.estimatedTokens).toBeGreaterThan(without.estimatedTokens);
  });
});

describe("T034: bounded repo-map block in prompts", () => {
  it("renders repo-map within configured budget", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-int-"));
    try {
      // Create enough files to exceed a small budget
      for (let i = 0; i < 20; i++) {
        const dir = path.join(root, "src", `mod${i}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.ts"), `export const fn${i} = () => {};`, "utf-8");
      }

      const collected = collectFiles(root, { ignore: createIgnoreOptions(), maxFiles: 50 });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);

      // Small budget: only a few files should fit
      const small = renderRepoMap(repoMap, { maxChars: 200 });
      expect(small.length).toBeLessThanOrEqual(200);

      // Larger budget: more files should fit
      const large = renderRepoMap(repoMap, { maxChars: 5000 });
      expect(large.length).toBeLessThanOrEqual(5000);
      expect(large.length).toBeGreaterThan(small.length);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("repo-map block stays within prompt budget from config", () => {
    // simulate config-level budget of 10240 chars (10KB default)
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-int-"));
    try {
      for (let i = 0; i < 30; i++) {
        const dir = path.join(root, "src", `mod${i}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.ts"), `export const mod${i} = () => {};`, "utf-8");
      }

      const collected = collectFiles(root, { ignore: createIgnoreOptions(), maxFiles: 50 });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);
      const rendered = renderRepoMap(repoMap, { maxChars: 10_240 });

      expect(rendered.length).toBeLessThanOrEqual(10_240);
      expect(rendered).toContain("<repo-map>");
      expect(rendered).toContain("</repo-map>");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("empty repo renders empty string", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-map-empty-int-"));
    try {
      const collected = collectFiles(root, { ignore: createIgnoreOptions(), maxFiles: 50 });
      const repoMap = buildRepoMap(root, collected.files, collected.diagnostics);
      const rendered = renderRepoMap(repoMap);
      expect(rendered).toBe("");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
