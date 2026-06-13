import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { grepTool } from "../../src/tools/grep";
import type { ToolContext } from "../../src/tools/types";

let workspace: string;
let context: ToolContext;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "superagent-grep-"));
  context = { workingDirectory: workspace, sessionId: "test-session" };
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe("Grep tool", () => {
  it("returns matching lines with file and line number", async () => {
    await writeFile(join(workspace, "a.ts"), "alpha\nconst target = 1;\nomega");
    await writeFile(join(workspace, "b.ts"), "no match");

    const result = await grepTool({ pattern: "target" }, context);

    expect(result.error).toBeUndefined();
    expect(result.metadata).toMatchObject({ match_count: 1, truncated: false });
    expect(result.output).toContain("a.ts:2: const target = 1;");
  });

  it("returns an empty match set when nothing is found", async () => {
    await writeFile(join(workspace, "a.ts"), "alpha");

    const result = await grepTool({ pattern: "missing" }, context);

    expect(result.error).toBeUndefined();
    expect(result.output).toBe("No matches found");
    expect(result.metadata).toMatchObject({ match_count: 0 });
  });

  it("returns an error for invalid regex", async () => {
    const result = await grepTool({ pattern: "[" }, context);

    expect(result.output).toBe("");
    expect(result.error).toContain("Invalid regex pattern:");
  });

  it("truncates after 250 matches", async () => {
    const content = Array.from({ length: 300 }, (_, index) => `target ${index}`).join("\n");
    await writeFile(join(workspace, "many.txt"), content);

    const result = await grepTool({ pattern: "target" }, context);

    expect(result.output.split("\n")).toHaveLength(251);
    expect(result.output).toContain("Showing first 250 of 300 matches");
    expect(result.metadata).toMatchObject({ match_count: 300, returned_count: 250, truncated: true });
  });

  it("filters by glob suffix", async () => {
    await writeFile(join(workspace, "a.ts"), "target");
    await writeFile(join(workspace, "b.md"), "target");

    const result = await grepTool({ pattern: "target", glob: "*.ts" }, context);

    expect(result.output).toContain("a.ts:1: target");
    expect(result.output).not.toContain("b.md");
  });

  it("skips ignored directories", async () => {
    await mkdir(join(workspace, "node_modules"));
    await writeFile(join(workspace, "node_modules", "dep.js"), "target");

    const result = await grepTool({ pattern: "target" }, context);

    expect(result.output).toBe("No matches found");
  });
});
