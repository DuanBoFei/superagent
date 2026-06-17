// ── Types ──
export {
  type RepoMap,
  type RepoMapInput,
  createRepoMap,
  type IndexedFile,
  type IndexedFileInput,
  createIndexedFile,
  type CodeSymbol,
  type CodeSymbolInput,
  type SymbolKind,
  createCodeSymbol,
  type RepoMapQuery,
  type RepoMapQueryInput,
  createQuery,
  type RepoMapResult,
  createEmptyResult,
  type RepoMapDiagnostic,
  type RepoMapDiagnosticInput,
  type DiagnosticReason,
  createDiagnostic,
} from "./types";

// ── Ignore ──
export {
  type IgnoreOptions,
  createIgnoreOptions,
  shouldIgnore,
  isBinaryExtension,
  isSecretPath,
  isIgnoredDirectory,
} from "./ignore";

// ── Collector ──
export { type CollectorOptions, type CandidateFile, type CollectResult, collectFiles } from "./collector";

// ── Extractor ──
export { type ExtractResult, extractSymbols } from "./extractor";

// ── Builder ──
export { buildRepoMap } from "./builder";

// ── Search ──
export { searchRepoMap } from "./search";

// ── Render ──
export { type RenderOptions, renderRepoMap } from "./render";

// ── Refresh ──
export { type RefreshOptions, refreshRepoMap } from "./refresh";
