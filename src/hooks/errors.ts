import type { HookSafeError } from "./types";

type HookErrorCode =
  | "COMMAND_NOT_FOUND"
  | "NON_ZERO_EXIT"
  | "TIMEOUT"
  | "INVALID_JSON"
  | "OVERSIZED_OUTPUT";

const ERROR_MESSAGES: Record<HookErrorCode, string> = {
  COMMAND_NOT_FOUND: "Hook command not found",
  NON_ZERO_EXIT: "Hook command exited with a non-zero status",
  TIMEOUT: "Hook command timed out",
  INVALID_JSON: "Hook returned invalid JSON",
  OVERSIZED_OUTPUT: "Hook output was too large",
};

const SECRET_PATTERNS = [
  /\b(authorization)\s*:\s*[^\n\r]+/gi,
  /\b(api[_-]?key|token|secret|password)\s*=\s*[^\s\n\r]+/gi,
  /\b(sk-[a-zA-Z0-9_-]+)/g,
];

export function createSafeHookError(code: HookErrorCode, cause: unknown): HookSafeError {
  const detail = redactHookSecrets(formatCause(cause));
  return {
    code,
    message: ERROR_MESSAGES[code],
    ...(detail ? { detail } : {}),
  };
}

export function normalizeHookFailure(input: { exitCode: number; stderr: string }): HookSafeError {
  return createSafeHookError(
    "NON_ZERO_EXIT",
    `exitCode=${input.exitCode} stderr=${input.stderr}`,
  );
}

export function normalizeInvalidHookJson(stdout: string): HookSafeError {
  return createSafeHookError("INVALID_JSON", stdout);
}

export function truncateHookOutput(value: string, maxChars = 50_000): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n[truncated: hook output exceeded ${maxChars} characters]`;
}

export function redactHookSecrets(text: string): string {
  return SECRET_PATTERNS.reduce((value, pattern) => {
    return value.replace(pattern, (match: string, key?: string) => {
      if (!key || match.startsWith("sk-")) return "[REDACTED]";
      const separator = match.includes(":") ? ":" : "=";
      return `${key}${separator}${separator === ":" ? " " : ""}[REDACTED]`;
    });
  }, text);
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
