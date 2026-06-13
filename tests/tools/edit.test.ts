import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { editTool } from "../../src/tools/edit";
import type { ToolContext } from "../../src/tools/types";

let workspace: string;
let context: ToolContext;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "superagent-edit-"));
  context = { workingDirectory: workspace, sessionId: "test-session" };
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe("Edit tool", () => {
  it("replaces an exact single match and reports replacement lines", async () => {
    await writeFile(join(workspace, "file.ts"), "const x = 1;\nconst y = 2;");

    const result = await editTool(
      {
        file_path: "file.ts",
        old_string: "const x = 1;",
        new_string: "const x = 2;",
      },
      context,
    );

    expect(result.error).toBeUndefined();
    expect(await readFile(join(workspace, "file.ts"), "utf8")).toBe("const x = 2;\nconst y = 2;");
    expect(result.metadata).toMatchObject({
      file_path: "file.ts",
      replacements: [{ line_start: 1, line_end: 1 }],
    });
  });

  it("returns an error and leaves the file unchanged when no match exists", async () => {
    await writeFile(join(workspace, "file.ts"), "const x = 1;");

    const result = await editTool(
      { file_path: "file.ts", old_string: "missing", new_string: "new" },
      context,
    );

    expect(result.output).toBe("");
    expect(result.error).toBe("No match found. Use Read to verify the current content.");
    expect(await readFile(join(workspace, "file.ts"), "utf8")).toBe("const x = 1;");
  });

  it("returns line numbers for ambiguous multiple matches", async () => {
    await writeFile(join(workspace, "file.txt"), "TODO\nkeep\nTODO");

    const result = await editTool(
      { file_path: "file.txt", old_string: "TODO", new_string: "DONE" },
      context,
    );

    expect(result.output).toBe("");
    expect(result.error).toBe("Multiple matches found at lines 1, 3. Use replace_all: true or provide more context.");
    expect(await readFile(join(workspace, "file.txt"), "utf8")).toBe("TODO\nkeep\nTODO");
  });

  it("replaces all matches when replace_all is true", async () => {
    await writeFile(join(workspace, "file.txt"), "TODO\nkeep\nTODO");

    const result = await editTool(
      { file_path: "file.txt", old_string: "TODO", new_string: "DONE", replace_all: true },
      context,
    );

    expect(await readFile(join(workspace, "file.txt"), "utf8")).toBe("DONE\nkeep\nDONE");
    expect(result.metadata).toMatchObject({
      replacements: [
        { line_start: 1, line_end: 1 },
        { line_start: 3, line_end: 3 },
      ],
    });
  });

  it("rejects empty old_string", async () => {
    const result = await editTool(
      { file_path: "file.txt", old_string: "", new_string: "new" },
      context,
    );

    expect(result.output).toBe("");
    expect(result.error).toBe("old_string must not be empty");
  });
});
