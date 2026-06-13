import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { z } from "zod";
import type { ToolContext, ToolResult } from "./types";

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", ".next", "build"]);
const MAX_MATCHES = 250;

export const grepToolSchema = z.object({
  pattern: z.string().min(1),
  path: z.string().optional(),
  glob: z.string().optional(),
});

interface Match {
  file: string;
  line_number: number;
  line_content: string;
}

export async function grepTool(
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const parsed = grepToolSchema.safeParse(args);
  if (!parsed.success) {
    return { output: "", error: parsed.error.message };
  }

  let regex: RegExp;
  try {
    regex = new RegExp(parsed.data.pattern);
  } catch (error) {
    return { output: "", error: `Invalid regex pattern: ${(error as Error).message}` };
  }

  const searchRoot = resolve(context.workingDirectory, parsed.data.path ?? ".");
  if (!isWithin(context.workingDirectory, searchRoot)) {
    return {
      output: "",
      error: `Path must stay within project directory: ${parsed.data.path}`,
    };
  }

  const matches: Match[] = [];
  let totalMatches = 0;
  for (const file of walkFiles(searchRoot, context.workingDirectory)) {
    const rel = toRelative(context.workingDirectory, file);
    if (parsed.data.glob && !matchesGlob(rel, parsed.data.glob)) {
      continue;
    }

    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      if (!regex.test(lines[index] ?? "")) {
        continue;
      }

      totalMatches++;
      if (matches.length < MAX_MATCHES) {
        matches.push({
          file: rel,
          line_number: index + 1,
          line_content: lines[index] ?? "",
        });
      }
    }
  }

  if (totalMatches === 0) {
    return {
      output: "No matches found",
      metadata: { match_count: 0, returned_count: 0, truncated: false },
    };
  }

  const output = matches
    .map((match) => `${match.file}:${match.line_number}: ${match.line_content}`)
    .join("\n");
  const warning =
    totalMatches > MAX_MATCHES
      ? `\nShowing first 250 of ${totalMatches} matches`
      : "";

  return {
    output: `${output}${warning}`,
    metadata: {
      matches,
      match_count: totalMatches,
      returned_count: matches.length,
      truncated: totalMatches > MAX_MATCHES,
    },
  };
}

function* walkFiles(root: string, projectRoot: string): Generator<string> {
  for (const entry of readdirSync(root)) {
    if (IGNORED_DIRS.has(entry)) {
      continue;
    }

    const fullPath = resolve(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      yield* walkFiles(fullPath, projectRoot);
    } else if (stat.isFile() && isWithin(projectRoot, fullPath)) {
      yield fullPath;
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

function matchesGlob(file: string, pattern: string): boolean {
  if (pattern.startsWith("*.")) {
    return file.endsWith(pattern.slice(1));
  }

  if (pattern.endsWith("/**")) {
    return file.startsWith(pattern.slice(0, -3));
  }

  return file === pattern || file.endsWith(`/${pattern}`);
}
