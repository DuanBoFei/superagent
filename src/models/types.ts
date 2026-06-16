import type { Message } from "../runtime/types";

export interface ModelToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface Prompt {
  system: string;
  messages: Message[];
  tools?: ModelToolDefinition[];
}

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
};

export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolErrorCall = {
  name: string;
  arguments: string;
};

export type TokenChunk =
  | {
      type: "text";
      content: string;
      model?: string;
    }
  | {
      type: "tool_use";
      tool_call: ToolCall;
      model?: string;
    }
  | {
      type: "tool_error";
      tool_call: ToolErrorCall;
      error: string;
      model?: string;
    }
  | {
      type: "end";
      usage?: TokenUsage;
      model?: string;
      finish_reason?: string;
    };

export interface ModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
}

export class ModelError extends Error {
  code: string;
  status?: number;
  headers?: Headers;
  errors?: unknown[];

  constructor(
    code: string,
    message: string,
    details?: { status?: number; headers?: Headers; errors?: unknown[] },
  ) {
    super(message);
    this.name = "ModelError";
    this.code = code;
    this.status = details?.status;
    this.headers = details?.headers;
    this.errors = details?.errors;
  }
}
