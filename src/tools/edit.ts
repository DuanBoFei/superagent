import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { z } from "zod";
import type { ToolContext, ToolResult } from "./types";

export const editToolSchema = z.object({
  file_path: z.string().min(1),
  old_string: z.string(),
  new_string: z.string(),
  replace_all: z.boolean().optional(),
});

interface Replacement {
  line_start: number;
  line_end: number;
}

export async function editTool(
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const parsed = editToolSchema.safeParse(args);
  if (!parsed.success) {
    return { output: "", error: parsed.error.message };
  }

  const { file_path: filePath, old_string: oldString, new_string: newString } = parsed.data;
  if (oldString.length === 0) {
    return { output: "", error: "old_string must not be empty" };
  }

  const resolved = resolve(context.workingDirectory, filePath);
  if (!isWithin(context.workingDirectory, resolved)) {
    return {
      output: "",
      error: `Path must stay within project directory: ${filePath}`,
    };
  }

  if (!existsSync(resolved)) {
    return { output: "", error: `File not found: ${filePath}` };
  }

  const content = readFileSync(resolved, "utf8");
  const matches = findMatches(content, oldString);
  if (matches.length === 0) {
    return {
      output: "",
      error: "No match found. Use Read to verify the current content.",
    };
  }

  if (matches.length > 1 && !parsed.data.replace_all) {
    const lines = matches.map((match) => lineAt(content, match.index)).join(", ");
    return {
      output: "",
      error: `Multiple matches found at lines ${lines}. Use replace_all: true or provide more context.`,
    };
  }

  const replacements = matches.map((match) => ({
    line_start: lineAt(content, match.index),
    line_end: lineAt(content, match.index + oldString.length),
  }));
  const next = parsed.data.replace_all
    ? content.split(oldString).join(newString)
    : content.replace(oldString, newString);
  writeFileSync(resolved, next);

  return {
    output: `Replaced ${replacements.length} match${replacements.length === 1 ? "" : "es"} in ${filePath}`,
    metadata: { file_path: filePath, replacements },
  };
}

function findMatches(content: string, needle: string): Array<{ index: number }> {
  const matches: Array<{ index: number }> = [];
  let index = content.indexOf(needle);
  while (index !== -1) {
    matches.push({ index });
    index = content.indexOf(needle, index + needle.length);
  }
  return matches;
}

function lineAt(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

function isWithin(root: string, target: string): boolean {
  const rel = relative(resolve(root), target);
  return rel === "" || (!rel.startsWith("..") && !resolve(rel).startsWith(".."));
}
