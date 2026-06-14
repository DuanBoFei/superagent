import type { z } from "zod";

export interface ToolContext {
  workingDirectory: string;
  sessionId: string;
}

export interface ToolResult {
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type ToolFunction = (
  args: Record<string, unknown>,
  context: ToolContext,
) => Promise<ToolResult>;

export interface RegisteredTool {
  name: string;
  description?: string;
  fn: ToolFunction;
  schema: z.ZodSchema;
  concurrencySafe: boolean;
}

export type ToolRegistry = Map<string, RegisteredTool>;
