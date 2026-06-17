// ── RepoMap ──

export interface RepoMap {
  readonly rootPath: string;
  readonly files: IndexedFile[];
  readonly symbolTable: Record<string, CodeSymbol[]>;
  readonly importGraph: Record<string, string[]>;
  readonly diagnostics: RepoMapDiagnostic[];
  readonly updatedAt: number;
}

export interface RepoMapInput {
  rootPath: string;
  files?: IndexedFile[];
  symbolTable?: Record<string, CodeSymbol[]>;
  importGraph?: Record<string, string[]>;
  diagnostics?: RepoMapDiagnostic[];
  updatedAt?: number;
}

export function createRepoMap(input: RepoMapInput): RepoMap {
  return {
    rootPath: input.rootPath,
    files: input.files ?? [],
    symbolTable: input.symbolTable ?? {},
    importGraph: input.importGraph ?? {},
    diagnostics: input.diagnostics ?? [],
    updatedAt: input.updatedAt ?? Date.now(),
  };
}

// ── IndexedFile ──

export interface IndexedFile {
  readonly path: string;
  readonly language: string;
  readonly size: number;
  readonly mtime: number;
  readonly imports: string[];
  readonly exports: string[];
  readonly symbols: CodeSymbol[];
  readonly summary: string;
}

export interface IndexedFileInput {
  path: string;
  language?: string;
  size?: number;
  mtime?: number;
  imports?: string[];
  exports?: string[];
  symbols?: CodeSymbol[];
  summary?: string;
}

export function createIndexedFile(input: IndexedFileInput): IndexedFile {
  return {
    path: input.path,
    language: input.language ?? "unknown",
    size: input.size ?? 0,
    mtime: input.mtime ?? Date.now(),
    imports: input.imports ?? [],
    exports: input.exports ?? [],
    symbols: input.symbols ?? [],
    summary: input.summary ?? "",
  };
}

// ── CodeSymbol ──

export interface CodeSymbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly path: string;
  readonly line: number;
}

export type SymbolKind =
  | "function"
  | "class"
  | "method"
  | "const"
  | "let"
  | "var"
  | "type"
  | "interface"
  | "enum"
  | "unknown";

export interface CodeSymbolInput {
  name: string;
  kind: SymbolKind;
  path: string;
  line?: number;
}

export function createCodeSymbol(input: CodeSymbolInput): CodeSymbol {
  return {
    name: input.name,
    kind: input.kind,
    path: input.path,
    line: input.line ?? 0,
  };
}

// ── RepoMapQuery ──

export interface RepoMapQuery {
  readonly text: string;
  readonly language?: string;
  readonly pathPrefix?: string;
  readonly symbolKind?: SymbolKind;
}

export interface RepoMapQueryInput {
  text: string;
  language?: string;
  pathPrefix?: string;
  symbolKind?: SymbolKind;
}

export function createQuery(input: RepoMapQueryInput): RepoMapQuery {
  const q: RepoMapQuery = { text: input.text };
  if (input.language) (q as Record<string, unknown>).language = input.language;
  if (input.pathPrefix) (q as Record<string, unknown>).pathPrefix = input.pathPrefix;
  if (input.symbolKind) (q as Record<string, unknown>).symbolKind = input.symbolKind;
  return q;
}

// ── RepoMapResult ──

export interface RepoMapResult {
  readonly query: string;
  readonly files: IndexedFile[];
  readonly symbols: CodeSymbol[];
  readonly isEmpty: boolean;
}

export function createEmptyResult(query: string): RepoMapResult {
  return { query, files: [], symbols: [], isEmpty: true };
}

// ── RepoMapDiagnostic ──

export type DiagnosticReason =
  | "ignored-directory"
  | "ignored-secret"
  | "too-large"
  | "binary"
  | "generated"
  | "read-error";

export interface RepoMapDiagnostic {
  readonly filePath: string;
  readonly reason: DiagnosticReason;
  readonly message: string;
}

export interface RepoMapDiagnosticInput {
  filePath: string;
  reason: DiagnosticReason;
  message: string;
}

export function createDiagnostic(input: RepoMapDiagnosticInput): RepoMapDiagnostic {
  return {
    filePath: input.filePath,
    reason: input.reason,
    message: input.message,
  };
}
