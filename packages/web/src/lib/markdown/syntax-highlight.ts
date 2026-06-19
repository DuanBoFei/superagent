const LANGUAGE_NAMES: Record<string, string> = {
  bash: "Shell",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  css: "CSS",
  go: "Go",
  html: "HTML",
  java: "Java",
  js: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  md: "Markdown",
  php: "PHP",
  py: "Python",
  rb: "Ruby",
  rs: "Rust",
  ruby: "Ruby",
  rust: "Rust",
  sh: "Shell",
  shell: "Shell",
  sql: "SQL",
  swift: "Swift",
  ts: "TypeScript",
  tsx: "TSX",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
};

const SUPPORTED_LANGUAGES = new Set(Object.keys(LANGUAGE_NAMES));
const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "def",
  "default",
  "defer",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "func",
  "function",
  "if",
  "import",
  "in",
  "interface",
  "let",
  "match",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "struct",
  "switch",
  "throw",
  "true",
  "try",
  "type",
  "var",
  "void",
  "while",
]);

export function highlightCode(code: string, lang?: string): string {
  const normalizedLang = normalizeLanguage(lang);
  const escaped = escapeHtml(code);
  if (!normalizedLang || !SUPPORTED_LANGUAGES.has(normalizedLang)) {
    return escaped;
  }

  return escaped.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`|\/\/.*?$|#.*?$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/gm, (token) => {
    if (token.startsWith("//") || token.startsWith("#")) {
      return wrapToken("comment", token);
    }
    if (token.startsWith("&quot;") || token.startsWith("&#39;") || token.startsWith("`")) {
      return wrapToken("string", token);
    }
    if (/^\d/.test(token)) {
      return wrapToken("number", token);
    }
    if (KEYWORDS.has(token)) {
      return wrapToken("keyword", token);
    }
    return token;
  });
}

export function getLanguageName(lang?: string): string {
  const normalizedLang = normalizeLanguage(lang);
  return normalizedLang ? (LANGUAGE_NAMES[normalizedLang] ?? "Plain Text") : "Plain Text";
}

function normalizeLanguage(lang?: string): string | undefined {
  return lang?.trim().toLowerCase().replace(/^language-/, "") || undefined;
}

function wrapToken(kind: string, value: string): string {
  return `<span class="token ${kind}">${value}</span>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
