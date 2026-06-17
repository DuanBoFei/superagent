import { collectFiles } from "./collector";
import { buildRepoMap } from "./builder";
import { searchRepoMap } from "./search";
import { createIgnoreOptions, type IgnoreOptions } from "./ignore";
import type { RepoMapQuery, RepoMapResult } from "./types";

export interface QueryRepoMapOptions {
  rootPath: string;
  query: RepoMapQuery;
  ignore?: IgnoreOptions;
  maxFiles?: number;
  maxFileBytes?: number;
}

export function queryRepoMap(options: QueryRepoMapOptions): RepoMapResult {
  const collected = collectFiles(options.rootPath, {
    ignore: options.ignore ?? createIgnoreOptions(),
    maxFiles: options.maxFiles,
    maxFileBytes: options.maxFileBytes,
  });
  const repoMap = buildRepoMap(options.rootPath, collected.files, collected.diagnostics);
  return searchRepoMap(repoMap, options.query);
}
