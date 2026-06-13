export interface TerminalConfig {
  width: number;
  supportsColor: boolean;
  isTTY: boolean;
}

export interface DiffLine {
  type: "added" | "removed" | "context";
  content: string;
  lineNum?: number;
}

export interface DiffBlock {
  filePath: string;
  lines: DiffLine[];
}

export type PermissionResult = "approved" | "denied" | "always";

export interface TaskItem {
  subject: string;
  status: "pending" | "in_progress" | "completed";
}

export interface TurnStats {
  turnNumber: number;
  filesChanged: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}
