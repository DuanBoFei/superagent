import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { globTool } from "../../src/tools/glob";
import type { ToolContext } from "../../src/tools/types";

let workspace: string;
let context: ToolContext;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "superagent-glob-"));
  context = { workingDirectory: workspace, sessionId: "test-session" };
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe("Glob tool", () => {
  it("returns matching files", async () => {
    await writeFile(join(workspace, "a.ts"), "");
    await writeFile(join(workspace, "b.md"), "");

    const result = await globTool({ pattern: "*.ts" }, context);

    expect(result.error).toBeUndefined();
    expect(result.output).toBe("a.ts");
    expect(result.metadata).toMatchObject({ count: 1, truncated: false });
  });

  it("returns an empty result when no files match", async () => {
    await writeFile(join(workspace, "a.ts"), "");

    const result = await globTool({ pattern: "*.md" }, context);

    expect(result.error).toBeUndefined();
    expect(result.output).toBe("No files matched");
    expect(result.metadata).toMatchObject({ count: 0 });
  });

  it("blocks patterns that escape the project root", async () => {
    const result = await globTool({ pattern: "../*.ts" }, context);

    expect(result.output).toBe("");
    expect(result.error).toBe("Pattern must stay within project directory");
  });

  it("sorts files by mtime descending", async () => {
    await writeFile(join(workspace, "old.ts"), "");
    await writeFile(join(workspace, "new.ts"), "");
    await utimes(join(workspace, "old.ts"), new Date(1000), new Date(1000));
    await utimes(join(workspace, "new.ts"), new Date(2000), new Date(2000));

    const result = await globTool({ pattern: "*.ts" }, context);

    expect(result.output.split("\n")).toEqual(["new.ts", "old.ts"]);
  });

  it("ignores node_modules and build directories", async () => {
    await mkdir(join(workspace, "node_modules"));
    await mkdir(join(workspace, "build"));
    await writeFile(join(workspace, "node_modules", "dep.ts"), "");
    await writeFile(join(workspace, "build", "bundle.ts"), "");

    const result = await globTool({ pattern: "*.ts" }, context);

    expect(result.output).toBe("No files matched");
  });
});
