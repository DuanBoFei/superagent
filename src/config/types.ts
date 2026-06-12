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
