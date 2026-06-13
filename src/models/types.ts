import type { Message } from "../runtime/types";

export interface Prompt {
  system: string;
  messages: Message[];
}

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
};

export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
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

  constructor(code: string, message: string) {
    super(message);
    this.name = "ModelError";
    this.code = code;
  }
}
