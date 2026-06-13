export interface ContextMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolResults?: Array<{
    name: string;
    output: string;
  }>;
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  concurrencySafe: boolean;
}

export interface PromptContext {
  rulesFilePath: string;
  toolDefinitions: ToolDef[];
  contextWindowTokens: number;
  currentTokens: number;
}

export interface Prompt {
  system: string;
  messages: ContextMessage[];
  estimatedTokens: number;
  compacted: boolean;
}

export interface CompactionSummary {
  modifiedFiles: string[];
  errorsEncountered: string[];
  keyDecisions: string[];
  currentGoal: string;
  turnsSummarized: number;
}
