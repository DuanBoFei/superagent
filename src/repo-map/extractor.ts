import { createCodeSymbol, type CodeSymbol } from "./types";

// ── Language detection ──

const LANG_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".rb": "ruby",
  ".css": "css",
  ".html": "html",
  ".json": "json",
  ".md": "markdown",
  ".yaml": "yaml",
  ".yml": "yaml",
};

function detectLanguage(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return LANG_MAP[ext] ?? "text";
}

function isTSorJS(lang: string): boolean {
  return ["typescript", "tsx", "javascript", "jsx"].includes(lang);
}

// ── Line number helper ──

function lineNumber(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

// ── Import extraction ──

function extractImports(content: string): string[] {
  const result = new Set<string>();
  let match: RegExpExecArray | null;

  // ESM static: import ... from "spec" or import "spec"
  const esmRe = /import\b[^"']*["']([^"']+)["']/g;
  while ((match = esmRe.exec(content)) !== null) {
    result.add(match[1]);
  }

  // Dynamic: import("spec")
  const dynRe = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = dynRe.exec(content)) !== null) {
    result.add(match[1]);
  }

  // CJS: require("spec")
  const cjsRe = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = cjsRe.exec(content)) !== null) {
    result.add(match[1]);
  }

  return [...result];
}

// ── Export extraction ──

function extractExports(content: string): string[] {
  const result = new Set<string>();
  let match: RegExpExecArray | null;

  // export default function/class → "default"
  const defaultRe = /export\s+default\s+(?:function|class)\b/g;
  while ((match = defaultRe.exec(content)) !== null) {
    result.add("default");
  }

  // export function/const/class/let/var/type/interface/enum name
  const namedRe = /export\s+(?:function|const|class|let|var|type|interface|enum)\s+([\w$]+)/g;
  while ((match = namedRe.exec(content)) !== null) {
    result.add(match[1]);
  }

  // export { foo, bar }
  const reExportRe = /export\s+\{([^}]+)\}/g;
  while ((match = reExportRe.exec(content)) !== null) {
    const names = match[1].split(",").map((s) => s.trim());
    for (const name of names) {
      result.add(name);
    }
  }

  return [...result];
}

// ── Symbol extraction ──

function extractSymbolsImpl(content: string, filePath: string): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];
  let match: RegExpExecArray | null;

  const alreadyAdded = (name: string): boolean =>
    symbols.some((s) => s.name === name);

  // Arrow functions: const name = (...) => or const name = async (...) =>
  const arrowRe = /(?:export\s+)?(?:const|let)\s+([\w$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
  while ((match = arrowRe.exec(content)) !== null) {
    symbols.push(
      createCodeSymbol({
        name: match[1],
        kind: "function",
        path: filePath,
        line: lineNumber(content, match.index),
      }),
    );
  }

  // Function declarations (named, async, generator, exported)
  const funcRe = /(?:export\s+)?(?:async\s+)?function(?:\*)?\s+([\w$]+)/g;
  while ((match = funcRe.exec(content)) !== null) {
    if (!alreadyAdded(match[1])) {
      symbols.push(
        createCodeSymbol({
          name: match[1],
          kind: "function",
          path: filePath,
          line: lineNumber(content, match.index),
        }),
      );
    }
  }

  // Class declarations
  const classRe = /(?:export\s+)?class\s+([\w$]+)/g;
  while ((match = classRe.exec(content)) !== null) {
    symbols.push(
      createCodeSymbol({
        name: match[1],
        kind: "class",
        path: filePath,
        line: lineNumber(content, match.index),
      }),
    );
  }

  // Const declarations (skip if already added as arrow function)
  const constRe = /(?:export\s+)?const\s+([\w$]+)\s*=/g;
  while ((match = constRe.exec(content)) !== null) {
    if (!alreadyAdded(match[1])) {
      symbols.push(
        createCodeSymbol({
          name: match[1],
          kind: "const",
          path: filePath,
          line: lineNumber(content, match.index),
        }),
      );
    }
  }

  // Let declarations
  const letRe = /(?:export\s+)?let\s+([\w$]+)\s*=/g;
  while ((match = letRe.exec(content)) !== null) {
    if (!alreadyAdded(match[1])) {
      symbols.push(
        createCodeSymbol({
          name: match[1],
          kind: "let",
          path: filePath,
          line: lineNumber(content, match.index),
        }),
      );
    }
  }

  // Type aliases
  const typeRe = /(?:export\s+)?type\s+([\w$]+)\s*=/g;
  while ((match = typeRe.exec(content)) !== null) {
    symbols.push(
      createCodeSymbol({
        name: match[1],
        kind: "type",
        path: filePath,
        line: lineNumber(content, match.index),
      }),
    );
  }

  // Interfaces
  const interfaceRe = /(?:export\s+)?interface\s+([\w$]+)/g;
  while ((match = interfaceRe.exec(content)) !== null) {
    symbols.push(
      createCodeSymbol({
        name: match[1],
        kind: "interface",
        path: filePath,
        line: lineNumber(content, match.index),
      }),
    );
  }

  // Enums
  const enumRe = /(?:export\s+)?enum\s+([\w$]+)/g;
  while ((match = enumRe.exec(content)) !== null) {
    symbols.push(
      createCodeSymbol({
        name: match[1],
        kind: "enum",
        path: filePath,
        line: lineNumber(content, match.index),
      }),
    );
  }

  return symbols;
}

// ── Summary ──

function buildSummary(content: string): string {
  return content.trim().slice(0, 300);
}

// ── Main export ──

export interface ExtractResult {
  language: string;
  imports: string[];
  exports: string[];
  symbols: CodeSymbol[];
  summary: string;
}

export function extractSymbols(filePath: string, content: string): ExtractResult {
  const language = detectLanguage(filePath);

  if (!isTSorJS(language)) {
    return {
      language,
      imports: [],
      exports: [],
      symbols: [],
      summary: buildSummary(content),
    };
  }

  return {
    language,
    imports: extractImports(content),
    exports: extractExports(content),
    symbols: extractSymbolsImpl(content, filePath),
    summary: buildSummary(content),
  };
}
