import * as fs from "node:fs";
import * as path from "node:path";
import type { RepoMapDiagnostic } from "./types";
import { createDiagnostic } from "./types";
import { shouldIgnore, createIgnoreOptions, type IgnoreOptions } from "./ignore";

// ── Types ──

export interface CollectorOptions {
  ignore: IgnoreOptions;
  maxFiles?: number;
}

export interface CandidateFile {
  path: string;
  absolutePath: string;
  size: number;
  mtime: number;
}

export interface CollectResult {
  files: CandidateFile[];
  diagnostics: RepoMapDiagnostic[];
}

const DEFAULT_MAX_FILES = 500;

function walkDir(
  dir: string,
  rootPath: string,
  options: CollectorOptions,
  result: CollectResult,
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    result.diagnostics.push(
      createDiagnostic({
        filePath: path.relative(rootPath, dir).replace(/\\/g, "/"),
        reason: "read-error",
        message: `Skipped: cannot read directory`,
      }),
    );
    return;
  }

  // Sort for deterministic output
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, "/");

    // Check ignore before anything else
    const ignoreResult = shouldIgnore(relativePath, options.ignore);
    if (ignoreResult !== null) {
      result.diagnostics.push(ignoreResult);
      if (ignoreResult.reason === "ignored-directory" && entry.isDirectory()) {
        // Skip entire ignored directory tree
        continue;
      }
      // For ignored files, record diagnostic but continue
      if (!entry.isDirectory()) continue;
    }

    if (entry.isDirectory()) {
      walkDir(fullPath, rootPath, options, result);
    } else if (entry.isFile()) {
      // Check max files limit
      if (result.files.length >= (options.maxFiles ?? DEFAULT_MAX_FILES)) {
        result.diagnostics.push(
          createDiagnostic({
            filePath: relativePath,
            reason: "too-large",
            message: `Skipped: max file count (${options.maxFiles ?? DEFAULT_MAX_FILES}) exceeded`,
          }),
        );
        continue;
      }

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        result.diagnostics.push(
          createDiagnostic({
            filePath: relativePath,
            reason: "read-error",
            message: `Skipped: cannot stat file`,
          }),
        );
        continue;
      }

      // Re-check ignore with file size
      const sizeCheck = shouldIgnore(
        relativePath,
        options.ignore,
        stat.size,
      );
      if (sizeCheck !== null) {
        result.diagnostics.push(sizeCheck);
        continue;
      }

      result.files.push({
        path: relativePath,
        absolutePath: fullPath,
        size: stat.size,
        mtime: stat.mtimeMs,
      });
    }
  }
}

export function collectFiles(
  rootPath: string,
  options: CollectorOptions,
): CollectResult {
  const absRoot = path.resolve(rootPath);
  const result: CollectResult = { files: [], diagnostics: [] };

  walkDir(absRoot, absRoot, options, result);

  return result;
}
