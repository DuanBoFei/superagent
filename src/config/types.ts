import type { BrowserConfig } from "../browser/types";
import type { HookConfig, HookEventName } from "../hooks/types";
import type { SandboxConfig } from "../sandbox/types";

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

export interface Config {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTurns: number;
  fallbackModel: string;
  fallbackBaseUrl: string;
  permissions: {
    autoApprove: string[];
    deny: string[];
    askTimeout: number;
  };
  rulesFile: string;
  mcpServers: Record<string, McpServerConfig>;
  hooks: Partial<Record<HookEventName, HookConfig[]>>;
  sandbox: SandboxConfig;
  browser: BrowserConfig;
}

export interface ConfigLoadResult {
  config: Config;
  warnings: string[];
}

export class ConfigError extends Error {
  code: "MISSING_REQUIRED_KEY" | "PARSE_ERROR" | "ENCODING_ERROR";
  filePath?: string;
  lineNumber?: number;

  constructor(
    code: "MISSING_REQUIRED_KEY" | "PARSE_ERROR" | "ENCODING_ERROR",
    message: string,
    details?: { filePath?: string; lineNumber?: number },
  ) {
    super(message);
    this.name = "ConfigError";
    this.code = code;
    this.filePath = details?.filePath;
    this.lineNumber = details?.lineNumber;
  }
}
