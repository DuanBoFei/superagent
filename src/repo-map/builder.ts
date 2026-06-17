import * as fs from "node:fs";
import * as path from "node:path";
import type { CandidateFile } from "./collector";
import { extractSymbols } from "./extractor";
import { createIndexedFile, createRepoMap, createDiagnostic, type RepoMap, type RepoMapDiagnostic } from "./types";

function readCandidate(rootPath: string, candidate: CandidateFile, diagnostics: RepoMapDiagnostic[]): string | null {
  try {
    return fs.readFileSync(candidate.absolutePath, "utf-8");
  } catch {
    diagnostics.push(
      createDiagnostic({
        filePath: candidate.path,
        reason: "read-error",
        message: `Skipped: cannot read file for extraction`,
      }),
    );
    return null;
  }
}

export function buildRepoMap(
  rootPath: string,
  candidates: CandidateFile[],
  collectorDiagnostics: RepoMapDiagnostic[],
): RepoMap {
  const absRoot = path.resolve(rootPath);
  const diagnostics: RepoMapDiagnostic[] = [...collectorDiagnostics];
  const indexedFiles = [];
  const symbolTable: Record<string, import("./types").CodeSymbol[]> = {};
  const importGraph: Record<string, string[]> = {};

  for (const candidate of candidates) {
    const content = readCandidate(absRoot, candidate, diagnostics);
    if (content === null) continue;

    const extracted = extractSymbols(candidate.path, content);

    const indexed = createIndexedFile({
      path: candidate.path,
      language: extracted.language,
      size: candidate.size,
      mtime: candidate.mtime,
      imports: extracted.imports,
      exports: extracted.exports,
      symbols: extracted.symbols,
      summary: extracted.summary,
    });

    indexedFiles.push(indexed);

    // Populate symbol table
    for (const sym of extracted.symbols) {
      if (!symbolTable[sym.name]) {
        symbolTable[sym.name] = [];
      }
      symbolTable[sym.name].push(sym);
    }

    // Populate import graph (only if file has imports)
    if (extracted.imports.length > 0) {
      importGraph[candidate.path] = extracted.imports;
    }
  }

  return createRepoMap({
    rootPath: absRoot,
    files: indexedFiles,
    symbolTable,
    importGraph,
    diagnostics,
  });
}
