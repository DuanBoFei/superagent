const MCP_TOOL_PREFIX = "mcp__";
const MCP_SEPARATOR = "__";
const SAFE_NAME_PATTERN = /^[a-z0-9_]+$/;

export function normalizeMcpNamePart(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("MCP name part cannot be empty");
  }
  if (trimmed.includes("__") || trimmed.toLowerCase().startsWith("mcp__")) {
    throw new Error(`Unsafe MCP name part: ${value}`);
  }

  const normalized = trimmed.toLowerCase().replace(/[\s.-]+/g, "_");
  if (!SAFE_NAME_PATTERN.test(normalized)) {
    throw new Error(`Unsafe MCP name part: ${value}`);
  }
  return normalized;
}

export function buildMcpToolName(serverName: string, toolName: string): string {
  return `${MCP_TOOL_PREFIX}${normalizeMcpNamePart(serverName)}${MCP_SEPARATOR}${normalizeMcpNamePart(toolName)}`;
}

export function parseMcpToolName(value: string): { serverName: string; toolName: string } {
  if (!value.startsWith(MCP_TOOL_PREFIX)) {
    throw new Error(`Invalid MCP tool name: ${value}`);
  }

  const rest = value.slice(MCP_TOOL_PREFIX.length);
  const parts = rest.split(MCP_SEPARATOR);
  if (parts.length !== 2) {
    throw new Error(`Invalid MCP tool name: ${value}`);
  }

  const [serverName, toolName] = parts;
  if (!serverName || !toolName) {
    throw new Error("MCP name part cannot be empty");
  }
  return {
    serverName: normalizeMcpNamePart(serverName),
    toolName: normalizeMcpNamePart(toolName),
  };
}
