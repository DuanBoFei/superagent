const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]+/g,
  /(api[_-]?key\s*[=:]\s*)[^\s"']+/gi,
  /(token\s*[=:]\s*)[^\s"']+/gi,
];

export type BrowserFailureReason =
  | "playwright_unavailable"
  | "browser_unavailable"
  | "launch_failed"
  | "setup_failed"
  | "navigation_failed"
  | "action_failed"
  | "timeout";

export function redactBrowserSecrets(value: string): string {
  return SECRET_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, (_match, prefix?: string | number) =>
      typeof prefix === "string" ? `${prefix}[REDACTED]` : "[REDACTED]",
    ),
    value,
  );
}

export function normalizeBrowserError(reason: BrowserFailureReason, detail: string): string {
  const safeDetail = redactBrowserSecrets(detail);
  switch (reason) {
    case "playwright_unavailable":
      return `Playwright unavailable: ${safeDetail}`;
    case "browser_unavailable":
      return `Browser executable unavailable: ${safeDetail}`;
    case "launch_failed":
      return `Browser launch failed: ${safeDetail}`;
    case "setup_failed":
      return `Browser setup failed: ${safeDetail}`;
    case "navigation_failed":
      return `Browser navigation failed: ${safeDetail}`;
    case "action_failed":
      return `Browser action failed: ${safeDetail}`;
    case "timeout":
      return `Browser action timed out: ${safeDetail}`;
  }
}
