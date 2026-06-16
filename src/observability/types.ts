// ── Event types (discriminated union, 10 variants) ──

export type LogEvent =
  | {
      type: "session:start";
      sessionId: string;
      config: { model: string; maxTurns: number };
    }
  | {
      type: "session:end";
      exitCode: number;
    }
  | {
      type: "turn:start";
      turnNumber: number;
    }
  | {
      type: "turn:end";
      turnNumber: number;
      inputTokens: number;
      outputTokens: number;
    }
  | {
      type: "model:request";
      model: string;
      estimatedInputTokens: number;
    }
  | {
      type: "model:first_token";
      latencyMs: number;
    }
  | {
      type: "model:response";
      model: string;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }
  | {
      type: "tool:start";
      toolName: string;
      argsSummary: string;
    }
  | {
      type: "tool:end";
      toolName: string;
      durationMs: number;
      success: boolean;
    }
  | {
      type: "mcp:server_connect_start";
      serverName: string;
    }
  | {
      type: "mcp:server_connect_end";
      serverName: string;
      success: boolean;
      durationMs: number;
      error?: string;
    }
  | {
      type: "mcp:tools_refresh";
      serverName: string;
      success: boolean;
      durationMs: number;
      toolCount: number;
      error?: string;
    }
  | {
      type: "mcp:tool_start";
      serverName: string;
      toolName: string;
      permissionKey: string;
    }
  | {
      type: "mcp:tool_end";
      serverName: string;
      toolName: string;
      permissionKey: string;
      durationMs: number;
      success: boolean;
      error?: string;
    }
  | {
      type: "hook:start";
      hookName: string;
      hookEvent: string;
    }
  | {
      type: "hook:end";
      hookName: string;
      hookEvent: string;
      durationMs: number;
      exitCode?: number;
      decision: "continue" | "block";
      stdout?: string;
      stderr?: string;
    }
  | {
      type: "hook:failure";
      hookName: string;
      hookEvent: string;
      durationMs: number;
      exitCode?: number;
      decision: "continue" | "block";
      stdout?: string;
      stderr?: string;
      error?: { code: string; message: string; detail?: string };
    }
  | {
      type: "hook:block";
      hookName: string;
      hookEvent: string;
      durationMs: number;
      exitCode?: number;
      decision: "block";
      message?: string;
    }
  | {
      type: "sandbox:start";
      executionId: string;
      image: string;
      workspaceMount: string;
      network: "none" | "host";
      commandSummary: string;
    }
  | {
      type: "sandbox:end";
      executionId: string;
      image: string;
      workspaceMount: string;
      network: "none" | "host";
      commandSummary: string;
      durationMs: number;
      success: boolean;
      exitCode: number | null;
      timedOut: boolean;
    }
  | {
      type: "sandbox:failure";
      executionId: string;
      image: string;
      workspaceMount: string;
      network: "none" | "host";
      commandSummary: string;
      durationMs: number;
      timedOut: boolean;
      safeError: string;
    }
  | {
      type: "browser:start";
      action: string;
      urlSummary?: string;
      inputSummary?: string;
    }
  | {
      type: "browser:action";
      action: string;
      status: string;
      durationMs: number;
      urlSummary?: string;
      textSummary?: string;
      inputSummary?: string;
    }
  | {
      type: "browser:end";
      action: string;
      status: string;
      durationMs: number;
      success: boolean;
      timedOut: boolean;
    }
  | {
      type: "browser:failure";
      action: string;
      durationMs: number;
      timedOut: boolean;
      safeError: string;
      urlSummary?: string;
      inputSummary?: string;
    }
  | {
      type: "model:attempt_start";
      model: string;
      attempt: number;
      category?: string;
    }
  | {
      type: "model:attempt_end";
      model: string;
      attempt: number;
      durationMs: number;
      success: boolean;
      errorCategory?: string;
    }
  | {
      type: "model:fallback";
      from: string;
      to: string;
      reason: string;
    }
  | {
      type: "error";
      message: string;
      stack?: string;
    };

// ── Session stats ──

export interface SessionStats {
  turns: number;
  filesChanged: string[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

// ── Cost model ──

export type CostModel = Record<
  string,
  { inputPrice: number; outputPrice: number }
>;

export interface CostResult {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  unknownModel?: boolean;
}

export const DEFAULT_COST_MODEL: CostModel = {
  "deepseek-v4-pro": { inputPrice: 0.435, outputPrice: 0.87 },
  "deepseek-v4-flash": { inputPrice: 0.14, outputPrice: 0.28 },
};
