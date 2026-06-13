export function matchPattern(
  toolName: string,
  args: Record<string, unknown>,
  pattern: string,
): boolean {
  if (!pattern.includes(":")) return false;

  const colonIdx = pattern.indexOf(":");
  const patternTool = pattern.slice(0, colonIdx);
  const patternArgs = pattern.slice(colonIdx + 1);

  if (patternTool !== toolName && patternTool !== "*") return false;

  const argsStr = Object.values(args).join(" ");

  // Escape regex special chars, then replace * with .*
  const escaped = patternArgs.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexStr = escaped.replace(/\*/g, ".*");
  const regex = new RegExp(`^${regexStr}$`);

  return regex.test(argsStr);
}
