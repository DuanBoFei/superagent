import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readTool } from "../../src/tools/read";
import type { ToolContext } from "../../src/tools/types";

let workspace: string;
let context: ToolContext;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "superagent-read-"));
  context = { workingDirectory: workspace, sessionId: "test-session" };
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe("Read tool", () => {
  it("returns 1-indexed line numbered text", async () => {
    await writeFile(join(workspace, "file.txt"), "alpha\nbeta\ngamma");

    const result = await readTool({ file_path: "file.txt" }, context);

    expect(result.error).toBeUndefined();
    expect(result.output).toBe("1\talpha\n2\tbeta\n3\tgamma");
    expect(result.metadata).toMatchObject({ file_path: "file.txt", lines_returned: 3 });
  });

  it("applies offset and limit as 1-indexed line bounds", async () => {
    await writeFile(join(workspace, "file.txt"), "one\ntwo\nthree\nfour");

    const result = await readTool(
      { file_path: "file.txt", offset: 2, limit: 2 },
      context,
    );

    expect(result.output).toBe("2\ttwo\n3\tthree");
    expect(result.metadata).toMatchObject({ lines_returned: 2 });
  });

  it("returns an error for missing files without throwing", async () => {
    const result = await readTool({ file_path: "missing.txt" }, context);

    expect(result.output).toBe("");
    expect(result.error).toBe("File not found: missing.txt");
  });

  it("rejects binary files", async () => {
    await writeFile(join(workspace, "binary.bin"), Buffer.from([65, 0, 66]));

    const result = await readTool({ file_path: "binary.bin" }, context);

    expect(result.output).toBe("");
    expect(result.error).toBe("Cannot read binary file: binary.bin");
  });

  it("truncates files larger than 1MB to the first 2000 lines", async () => {
    const content = Array.from({ length: 3000 }, (_, index) =>
      `${index + 1} ${"x".repeat(400)}`,
    ).join("\n");
    await writeFile(join(workspace, "large.txt"), content);

    const result = await readTool({ file_path: "large.txt" }, context);

    expect(result.error).toBeUndefined();
    expect(result.output.split("\n")).toHaveLength(2001);
    expect(result.output).toContain("File too large");
    expect(result.metadata).toMatchObject({ truncated: true, lines_returned: 2000 });
  });

  it("blocks paths outside the working directory", async () => {
    const result = await readTool({ file_path: "../outside.txt" }, context);

    expect(result.output).toBe("");
    expect(result.error).toBe("Path must stay within project directory: ../outside.txt");
  });
});
