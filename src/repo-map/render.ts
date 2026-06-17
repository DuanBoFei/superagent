import type { RepoMap } from "./types";

const DEFAULT_MAX_CHARS = 10 * 1024; // 10 KB

export interface RenderOptions {
  maxChars?: number;
}

function shortKind(kind: string): string {
  const map: Record<string, string> = {
    function: "fn",
    class: "cls",
    const: "const",
    let: "let",
    var: "var",
    type: "type",
    interface: "iface",
    enum: "enum",
    method: "mthd",
    unknown: "?",
  };
  return map[kind] ?? kind;
}

export function renderRepoMap(
  repoMap: RepoMap,
  options?: RenderOptions,
): string {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;

  if (repoMap.files.length === 0) return "";

  const header = `<repo-map>\n${repoMap.files.length} files indexed`;
  const footer = `</repo-map>`;
  const headerFooterLen = header.length + footer.length + 2; // +2 for newlines

  let body = "";
  let truncated = false;

  for (const file of repoMap.files) {
    const parts: string[] = [];
    if (file.exports.length > 0) {
      parts.push(`exports: ${file.exports.join(", ")}`);
    }
    if (file.symbols.length > 0) {
      const symStr = file.symbols
        .map((s) => `${s.name}(${shortKind(s.kind)})`)
        .join(", ");
      parts.push(`symbols: ${symStr}`);
    }

    let line: string;
    if (parts.length > 0) {
      line = `\n${file.path}`;
      for (const p of parts) {
        line += `\n  ${p}`;
      }
    } else {
      line = `\n${file.path}`;
    }

    const candidate = header + body + line + `\n` + footer;
    if (candidate.length > maxChars) {
      truncated = true;
      break;
    }
    body += line;
  }

  let result = header + body;
  if (truncated) {
    result += `\n... (${repoMap.files.length} files total, truncated to fit budget)`;
  }
  result += `\n` + footer;

  // Final safety check: hard truncate if needed
  if (result.length > maxChars) {
    result = result.slice(0, maxChars - footer.length) + footer;
  }

  return result;
}
