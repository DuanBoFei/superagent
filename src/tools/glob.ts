import { readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { z } from "zod";
import type { ToolContext, ToolResult } from "./types";

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", ".next", "build"]);
const MAX_FILES = 1000;

export const globToolSchema = z.object({
  pattern: z.string().min(1),
  path: z.string().optional(),
});

interface Match {
  file: string;
  mtimeMs: number;
}

export async function globTool(
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const parsed = globToolSchema.safeParse(args);
  if (!parsed.success) {
    return { output: "", error: parsed.error.message };
  }

  if (parsed.data.pattern.includes("..")) {
    return { output: "", error: "Pattern must stay within project directory" };
  }

  const root = resolve(context.workingDirectory, parsed.data.path ?? ".");
  if (!isWithin(context.workingDirectory, root)) {
    return { output: "", error: "Pattern must stay within project directory" };
  }

  const matches = Array.from(walkFiles(root, context.workingDirectory))
    .filter((match) => matchesPattern(match.file, parsed.data.pattern))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  const returned = matches.slice(0, MAX_FILES);

  if (matches.length === 0) {
    return { output: "No files matched", metadata: { count: 0, truncated: false } };
  }

  return {
    output: returned.map((match) => match.file).join("\n"),
    metadata: {
      files: returned.map((match) => match.file),
      count: matches.length,
      returned_count: returned.length,
      truncated: matches.length > MAX_FILES,
    },
  };
}

function* walkFiles(root: string, projectRoot: string): Generator<Match> {
  for (const entry of readdirSync(root)) {
    if (IGNORED_DIRS.has(entry)) {
      continue;
    }

    const fullPath = resolve(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      yield* walkFiles(fullPath, projectRoot);
    } else if (stat.isFile() && isWithin(projectRoot, fullPath)) {
      yield { file: toRelative(projectRoot, fullPath), mtimeMs: stat.mtimeMs };
    }
  }
}

function isWithin(root: string, target: string): boolean {
  const rel = relative(resolve(root), target);
  return rel === "" || (!rel.startsWith("..") && !resolve(rel).startsWith(".."));
}

function toRelative(root: string, target: string): string {
  return relative(root, target).replace(/\\/g, "/");
}

function matchesPattern(file: string, pattern: string): boolean {
  if (pattern.startsWith("**/*.")) {
    return file.endsWith(pattern.slice(4));
  }

  if (pattern.startsWith("*.")) {
    return !file.includes("/") && file.endsWith(pattern.slice(1));
  }

  if (pattern.endsWith("/**")) {
    return file.startsWith(pattern.slice(0, -3));
  }

  return file === pattern || file.endsWith(`/${pattern}`);
}
