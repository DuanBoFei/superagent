export type McpServerConfig = McpStdioServerConfig | McpHttpServerConfig;

export interface McpStdioServerConfig {
  enabled: boolean;
  transport: "stdio";
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface McpHttpServerConfig {
  enabled: boolean;
  transport: "http";
  url: string;
  headers: Record<string, string>;
}

export type McpServerState =
  | "disabled"
  | "connecting"
  | "connected"
  | "refreshing"
  | "failed"
  | "disconnected";

export type McpPermissionDecision = "allow" | "ask" | "deny";

export interface McpSafeError {
  code: string;
  message: string;
  detail?: string;
}

export type McpContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string }
  | { type: "resource"; resource: unknown };

export type McpCallResult =
  | { ok: true; content: McpContentBlock[]; metadata?: Record<string, unknown> }
  | { ok: false; error: McpSafeError };

export interface McpToolDefinition {
  serverName: string;
  toolName: string;
  permissionKey: string;
  description: string;
  inputSchema: unknown;
  isAvailable: boolean;
}

export interface McpToolCall {
  serverName: string;
  toolName: string;
  permissionKey: string;
  permissionDecision: McpPermissionDecision;
  input: Record<string, unknown>;
  result: McpCallResult;
  durationMs: number;
  success: boolean;
}

export interface McpServerSession {
  serverName: string;
  state: McpServerState;
  lastError?: McpSafeError;
  tools: McpToolDefinition[];
  connectedAt?: Date;
  updatedAt: Date;
}
