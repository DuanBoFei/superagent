import type { RepoMapDiagnostic, DiagnosticReason } from "./types";
import { createDiagnostic } from "./types";

// ── Ignore Options ──

export interface IgnoreOptions {
  readonly maxFileBytes: number;
  readonly extraIgnorePatterns: string[];
}

export function createIgnoreOptions(
  overrides?: Partial<IgnoreOptions>,
): IgnoreOptions {
  return {
    maxFileBytes: overrides?.maxFileBytes ?? 1_048_576, // 1 MB default
    extraIgnorePatterns: overrides?.extraIgnorePatterns ?? [],
  };
}

// ── Binary extensions ──

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
  ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv", ".webm",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".dat",
  ".o", ".obj", ".class", ".pyc",
  ".db", ".sqlite", ".sqlite3",
  ".lockb", ".yarn",
]);

export function isBinaryExtension(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf("."));
  return BINARY_EXTENSIONS.has(ext.toLowerCase());
}

// ── Directory ignore patterns ──

const IGNORED_DIR_PATTERNS = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)\.git(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)build(\/|$)/,
  /(^|\/)coverage(\/|$)/,
  /(^|\/)\.next(\/|$)/,
  /(^|\/)\.turbo(\/|$)/,
];

export function isIgnoredDirectory(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  // Also match at the start of path
  for (const pattern of IGNORED_DIR_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }
  // Also check path prefix for top-level matches
  const segments = normalized.split("/");
  const topDirs = new Set([
    "node_modules", ".git", "dist", "build", "coverage", ".next", ".turbo",
  ]);
  if (topDirs.has(segments[0])) return true;
  return false;
}

// ── Secret file patterns ──

const SECRET_PATTERNS = [
  /(^|\/)\.env(\..*)?$/,
  /\.pem$/i,
  /\.key$/i,
  /(^|\/)credentials\.json$/i,
  /(^|\/)service-account.*\.json$/i,
  /(^|\/|\\)secrets?\.(yaml|yml|json)$/i,
  /(^|\/)secrets(\/|$)/,
];

export function isSecretPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }
  return false;
}

// ── Generated / minified file patterns ──

const GENERATED_PATTERNS = [
  /\.min\.(js|css)$/i,
  /(^|\/)generated(\/|$)/,
];

function isGenerated(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  for (const pattern of GENERATED_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }
  return false;
}

// ── Custom patterns ──

function matchesCustomPatterns(
  filePath: string,
  patterns: string[],
): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  for (const raw of patterns) {
    // Simple glob-to-regex: convert ** to .+ and * to [^/]+
    const regexStr = raw
      .replace(/\./g, "\\.")
      .replace(/\*\*/g, "§§DOUBLESTAR§§")
      .replace(/\*/g, "[^/]*")
      .replace(/§§DOUBLESTAR§§/g, ".*");
    const re = new RegExp(`^${regexStr}$`);
    if (re.test(normalized)) return true;
    // Also test for substring match (non-anchored)
    if (raw.includes("**") && normalized.includes(raw.replace(/\*\*/g, "").replace(/\*/g, ""))) {
      continue; // use regex above
    }
  }
  return false;
}

// ── Main decision ──

export function shouldIgnore(
  filePath: string,
  options: IgnoreOptions,
  fileSize?: number,
  contentSample?: string,
): RepoMapDiagnostic | null {
  // 1. Ignored directories
  if (isIgnoredDirectory(filePath)) {
    return createDiagnostic({
      filePath,
      reason: "ignored-directory",
      message: `Skipped: matches directory ignore pattern`,
    });
  }

  // 2. Secret files
  if (isSecretPath(filePath)) {
    return createDiagnostic({
      filePath,
      reason: "ignored-secret",
      message: `Skipped: matches secret-file pattern`,
    });
  }

  // 3. Generated / minified
  if (isGenerated(filePath)) {
    return createDiagnostic({
      filePath,
      reason: "generated",
      message: `Skipped: appears to be generated or minified`,
    });
  }

  // 4. Binary by extension
  if (isBinaryExtension(filePath)) {
    return createDiagnostic({
      filePath,
      reason: "binary",
      message: `Skipped: binary file extension`,
    });
  }

  // 5. Binary by content (null-byte detection)
  if (contentSample !== undefined) {
    if (contentSample.includes("\x00")) {
      return createDiagnostic({
        filePath,
        reason: "binary",
        message: `Skipped: null bytes detected in content`,
      });
    }
  }

  // 6. Oversized
  if (fileSize !== undefined && fileSize > options.maxFileBytes) {
    return createDiagnostic({
      filePath,
      reason: "too-large",
      message: `Skipped: exceeds size limit (${options.maxFileBytes} bytes)`,
    });
  }

  // 7. Custom patterns
  if (options.extraIgnorePatterns.length > 0) {
    if (matchesCustomPatterns(filePath, options.extraIgnorePatterns)) {
      return createDiagnostic({
        filePath,
        reason: "ignored-directory",
        message: `Skipped: matches custom ignore pattern`,
      });
    }
  }

  return null;
}
