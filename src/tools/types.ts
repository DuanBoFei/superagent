import type { z } from "zod";
import type { LogEvent } from "../observability/types";
import type { DockerCliAdapter } from "../sandbox/docker-cli";
import type { SandboxConfig } from "../sandbox/types";

export interface ToolContext {
  workingDirectory: string;
  sessionId: string;
  sandbox?: {
    config: SandboxConfig;
    docker?: DockerCliAdapter;
    emit?: (event: LogEvent) => void;
  };
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
