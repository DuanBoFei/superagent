const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]+/g,
  /(api[_-]?key\s*[=:]\s*)[^\s"']+/gi,
  /(token\s*[=:]\s*)[^\s"']+/gi,
];

const MAX_OUTPUT_CHARS = 100 * 1024;

export type SandboxFailureReason =
  | "docker_unavailable"
  | "image_unavailable"
  | "pull_failed"
  | "startup_failed"
  | "timeout";

export function redactSandboxSecrets(value: string): string {
  return SECRET_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, (_match, prefix?: string | number) =>
      typeof prefix === "string" ? `${prefix}[REDACTED]` : "[REDACTED]",
    ),
    value,
  );
}

export function truncateSandboxOutput(value: string, maxChars = MAX_OUTPUT_CHARS): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)}\n[truncated]`;
}

export function safeSandboxOutput(value: string): string {
  return redactSandboxSecrets(truncateSandboxOutput(value));
}

export function normalizeSandboxError(reason: SandboxFailureReason, detail: string): string {
  const safeDetail = redactSandboxSecrets(detail);
  switch (reason) {
    case "docker_unavailable":
      return `Docker unavailable: ${safeDetail}`;
    case "image_unavailable":
      return `Docker image unavailable: ${safeDetail}`;
    case "pull_failed":
      return `Docker image pull failed: ${safeDetail}`;
    case "startup_failed":
      return `Docker container startup failed: ${safeDetail}`;
    case "timeout":
      return `Sandbox command timed out: ${safeDetail}`;
  }
}
