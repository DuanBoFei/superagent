import type { IgnoreOptions } from "./ignore";
import { collectFiles } from "./collector";
import { buildRepoMap } from "./builder";
import type { RepoMap } from "./types";

export interface RefreshOptions {
  ignore: IgnoreOptions;
  maxFiles?: number;
}

export function refreshRepoMap(
  _repoMap: RepoMap,
  rootPath: string,
  options: RefreshOptions,
): RepoMap {
  const freshCollect = collectFiles(rootPath, {
    ignore: options.ignore,
    maxFiles: options.maxFiles,
  });

  // Full rebuild from fresh filesystem state.
  // For MVP this is acceptable; large-repo incremental extraction
  // (only re-reading changed files) can be added later.
  return buildRepoMap(rootPath, freshCollect.files, freshCollect.diagnostics);
}
