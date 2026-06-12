export enum State {
  IDLE = "IDLE",
  THINKING = "THINKING",
  TOOL_CALL = "TOOL_CALL",
  WAITING_APPROVAL = "WAITING_APPROVAL",
  COMPACTING = "COMPACTING",
  INTERRUPTED = "INTERRUPTED",
  ERROR = "ERROR",
  COMPLETED = "COMPLETED",
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  name: string;
  success: boolean;
  output: string;
  error?: string;
}

export interface TurnSummary {
  turnNumber: number;
  totalTokens: number;
  totalCost: number;
  reason: "completed" | "max_turns" | "interrupted" | "error";
}

export type TurnEvent =
  | { type: "text"; content: string }
  | {
      type: "tool_call";
      name: string;
      args: Record<string, unknown>;
    }
  | { type: "tool_result"; name: string; success: boolean; summary: string }
  | { type: "turn_end"; summary: TurnSummary }
  | { type: "error"; message: string };

export interface SessionState {
  sessionId: string;
  turnNumber: number;
  messages: Message[];
  toolResults: ToolResult[];
  state: State;
  interruptFlag: boolean;
  startedAt: number;
}

export interface TurnContext {
  messages: Message[];
  config: {
    maxTurns: number;
    model: string;
  };
  tools: Array<{
    name: string;
    description: string;
  }>;
}

export interface Token {
  type: "text" | "tool_use";
  content?: string;
  name?: string;
  arguments?: string;
}
