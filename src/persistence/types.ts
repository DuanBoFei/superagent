export interface SessionRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  turnCount: number;
  firstMessage: string;
  stateJson: string;
}

export interface SessionSummary {
  id: string;
  date: string;
  turns: number;
  firstMessage: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
}
