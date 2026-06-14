import type { McpSafeError } from "./types";

type McpErrorCode = "CONNECTION_FAILED" | "TOOL_TIMEOUT" | "MALFORMED_OUTPUT" | "OVERSIZED_OUTPUT";

const ERROR_MESSAGES: Record<McpErrorCode, string> = {
  CONNECTION_FAILED: "Connection failed",
  TOOL_TIMEOUT: "Tool timed out",
  MALFORMED_OUTPUT: "Malformed tool output",
  OVERSIZED_OUTPUT: "Tool output was too large",
};

const SECRET_PATTERNS = [
  /\b(authorization)\s*:\s*[^\n\r]+/gi,
  /\b(api[_-]?key|token|secret|password)\s*=\s*[^\s\n\r]+/gi,
  /\b(sk-[a-zA-Z0-9_-]+)/g,
];

export function createSafeMcpError(code: McpErrorCode, cause: unknown): McpSafeError {
  const detail = redactMcpSecrets(formatCause(cause));
  return {
    code,
    message: ERROR_MESSAGES[code],
    ...(detail ? { detail } : {}),
  };
}

export function redactMcpSecrets(text: string): string {
  return SECRET_PATTERNS.reduce((value, pattern) => {
    return value.replace(pattern, (match: string, key?: string) => {
      if (!key || match.startsWith("sk-")) return "[REDACTED]";
      const separator = match.includes(":") ? ":" : "=";
      return `${key}${separator} [REDACTED]`.replace("= ", "=");
    });
  }, text);
}

export function truncateMcpResult(value: string, maxChars = 50_000): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n[truncated: MCP result exceeded ${maxChars} characters]`;
}

function formatCause(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "string") return cause;
  if (cause === undefined || cause === null) return "";
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}
