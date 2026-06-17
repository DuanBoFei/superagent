import type { RepoMap, RepoMapQuery, RepoMapResult } from "./types";
import { createEmptyResult } from "./types";

export function searchRepoMap(
  repoMap: RepoMap,
  query: RepoMapQuery,
): RepoMapResult {
  const { text, language, pathPrefix, symbolKind } = query;
  const queryLower = text.toLowerCase();

  // Filter candidates
  let candidates = repoMap.files;
  if (pathPrefix) {
    candidates = candidates.filter((f) => f.path.startsWith(pathPrefix!));
  }
  if (language) {
    candidates = candidates.filter((f) => f.language === language);
  }

  // Score each file
  const scored = candidates.map((file) => {
    let score = 0;

    // 1. Exact exported symbol match (highest)
    if (file.exports.some((e) => e === text)) {
      score += 100;
    }

    // 2. Exact top-level symbol match (high)
    if (file.symbols.some((s) => s.name === text)) {
      score += 80;
    }

    // 3. Exact file basename match (high)
    const basename = file.path.split("/").pop() ?? "";
    const basenameNoExt = basename.slice(0, basename.lastIndexOf("."));
    if (basename === text || basenameNoExt === text) {
      score += 60;
    }

    // 4. Import path/module match (medium)
    if (file.imports.some((i) => i.includes(text))) {
      score += 40;
    }

    // 5. Path substring match (medium)
    if (file.path.toLowerCase().includes(queryLower)) {
      score += 30;
    }

    // 6. Summary token match (low)
    const summaryWords = file.summary.toLowerCase().split(/\s+/);
    if (summaryWords.some((w) => w.includes(queryLower))) {
      score += 10;
    }

    return { file, score };
  });

  // Filter and sort by score descending
  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matched.length === 0) {
    return createEmptyResult(text);
  }

  // Collect matching symbols from matched files
  const resultSymbols = matched.flatMap(({ file }) =>
    file.symbols.filter((s) => s.name.toLowerCase().includes(queryLower)),
  );

  // Also include from symbol table (global)
  const seenNames = new Set(resultSymbols.map((s) => `${s.path}:${s.name}`));
  for (const [name, syms] of Object.entries(repoMap.symbolTable)) {
    if (name.toLowerCase().includes(queryLower)) {
      for (const sym of syms) {
        const key = `${sym.path}:${sym.name}`;
        if (!seenNames.has(key)) {
          resultSymbols.push(sym);
          seenNames.add(key);
        }
      }
    }
  }

  // Filter symbols by kind
  const filteredSymbols = symbolKind
    ? resultSymbols.filter((s) => s.kind === symbolKind)
    : resultSymbols;

  return {
    query: text,
    files: matched.map((m) => m.file),
    symbols: filteredSymbols,
    isEmpty: false,
  };
}
