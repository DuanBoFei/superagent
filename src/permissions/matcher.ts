export function matchPattern(
  toolName: string,
  args: Record<string, unknown>,
  pattern: string,
): boolean {
  if (!pattern) return false;

  if (pattern.startsWith("mcp__")) {
    return wildcardMatch(toolName, pattern);
  }

  if (!pattern.includes(":")) return false;

  const colonIdx = pattern.indexOf(":");
  const patternTool = pattern.slice(0, colonIdx);
  const patternArgs = pattern.slice(colonIdx + 1);

  if (patternTool !== toolName && patternTool !== "*") return false;

  const argsStr = Object.values(args).join(" ");
  return wildcardMatch(argsStr, patternArgs);
}

function wildcardMatch(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexStr = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${regexStr}$`).test(value);
}

