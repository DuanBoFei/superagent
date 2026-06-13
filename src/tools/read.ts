import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { z } from "zod";
import type { ToolContext, ToolResult } from "./types";

const MAX_FILE_BYTES = 1024 * 1024;
const LARGE_FILE_LINES = 2000;

export const readToolSchema = z.object({
  file_path: z.string().min(1),
  offset: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

export async function readTool(
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const parsed = readToolSchema.safeParse(args);
  if (!parsed.success) {
    return { output: "", error: parsed.error.message };
  }

  const filePath = parsed.data.file_path;
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

  const buffer = readFileSync(resolved);
  if (isBinary(buffer)) {
    return { output: "", error: `Cannot read binary file: ${filePath}` };
  }

  const stat = statSync(resolved);
  const lines = buffer.toString("utf8").split(/\r?\n/);
  const large = stat.size > MAX_FILE_BYTES;
  const offset = parsed.data.offset ?? 1;
  const limit = large ? LARGE_FILE_LINES : (parsed.data.limit ?? lines.length);
  const selected = lines.slice(offset - 1, offset - 1 + limit);
  const output = formatLines(selected, offset);
  const warning = large ? `\nFile too large (${stat.size} bytes). Showing first 2000 lines.` : "";

  return {
    output: `${output}${warning}`,
    metadata: {
      file_path: filePath,
      lines_returned: selected.length,
      truncated: large,
    },
  };
}

function isWithin(root: string, target: string): boolean {
  const rel = relative(resolve(root), target);
  return rel === "" || (!rel.startsWith("..") && !resolve(rel).startsWith(".."));
}

function isBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).includes(0);
}

function formatLines(lines: string[], startLine: number): string {
  return lines.map((line, index) => `${startLine + index}\t${line}`).join("\n");
}
