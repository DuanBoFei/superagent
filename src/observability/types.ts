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
