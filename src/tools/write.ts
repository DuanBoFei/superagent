import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { z } from "zod";
import type { ToolContext, ToolResult } from "./types";

const MAX_CONTENT_BYTES = 1024 * 1024;

export const writeToolSchema = z.object({
  file_path: z.string().min(1),
  content: z.string(),
});

export async function writeTool(
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const parsed = writeToolSchema.safeParse(args);
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

  const bytes = Buffer.byteLength(parsed.data.content);
  if (bytes > MAX_CONTENT_BYTES) {
    return { output: "", error: `Content too large (${bytes} bytes)` };
  }

  const parent = dirname(resolved);
  if (!existsSync(parent)) {
    return {
      output: "",
      error: `Directory not found: ${toRelative(context.workingDirectory, parent)}`,
    };
  }

  const overwritten = existsSync(resolved);
  const previousContent = overwritten ? readFileSync(resolved, "utf8") : undefined;
  writeFileSync(resolved, parsed.data.content);

  return {
    output: `Wrote ${bytes} bytes to ${filePath}`,
    metadata: {
      file_path: filePath,
      bytes_written: bytes,
      lines_written: countLines(parsed.data.content),
      overwritten,
      ...(previousContent !== undefined ? { previous_content: previousContent } : {}),
    },
  };
}

function isWithin(root: string, target: string): boolean {
  const rel = relative(resolve(root), target);
  return rel === "" || (!rel.startsWith("..") && !resolve(rel).startsWith(".."));
}

function toRelative(root: string, target: string): string {
  const rel = relative(root, target).replace(/\\/g, "/");
  return rel || ".";
}

function countLines(content: string): number {
  return content.length === 0 ? 0 : content.split(/\r?\n/).length;
}
