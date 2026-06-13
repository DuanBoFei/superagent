import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeTool } from "../../src/tools/write";
import type { ToolContext } from "../../src/tools/types";

let workspace: string;
let context: ToolContext;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "superagent-write-"));
  context = { workingDirectory: workspace, sessionId: "test-session" };
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe("Write tool", () => {
  it("creates a new file and reports bytes and lines", async () => {
    const result = await writeTool({ file_path: "out.txt", content: "hello" }, context);

    expect(result.error).toBeUndefined();
    expect(await readFile(join(workspace, "out.txt"), "utf8")).toBe("hello");
    expect(result.metadata).toMatchObject({
      file_path: "out.txt",
      bytes_written: 5,
      lines_written: 1,
      overwritten: false,
    });
  });

  it("overwrites an existing file and stores previous content metadata", async () => {
    await writeFile(join(workspace, "out.txt"), "old");

    const result = await writeTool({ file_path: "out.txt", content: "new\nline" }, context);

    expect(await readFile(join(workspace, "out.txt"), "utf8")).toBe("new\nline");
    expect(result.metadata).toMatchObject({
      bytes_written: 8,
      lines_written: 2,
      overwritten: true,
      previous_content: "old",
    });
  });

  it("errors when parent directory is missing", async () => {
    const result = await writeTool({ file_path: "missing/out.txt", content: "hello" }, context);

    expect(result.output).toBe("");
    expect(result.error).toBe("Directory not found: missing");
  });

  it("rejects content larger than 1MB", async () => {
    const content = "x".repeat(1024 * 1024 + 1);

    const result = await writeTool({ file_path: "large.txt", content }, context);

    expect(result.output).toBe("");
    expect(result.error).toBe(`Content too large (${Buffer.byteLength(content)} bytes)`);
  });

  it("blocks paths outside the working directory", async () => {
    const result = await writeTool({ file_path: "../out.txt", content: "hello" }, context);

    expect(result.output).toBe("");
    expect(result.error).toBe("Path must stay within project directory: ../out.txt");
  });

  it("writes files in existing nested directories", async () => {
    await mkdir(join(workspace, "nested"));

    const result = await writeTool({ file_path: "nested/out.txt", content: "hello" }, context);

    expect(result.error).toBeUndefined();
    expect(await readFile(join(workspace, "nested", "out.txt"), "utf8")).toBe("hello");
  });
});
