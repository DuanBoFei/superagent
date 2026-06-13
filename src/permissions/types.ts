export type PermissionResult = "approved" | "denied" | "always";

export interface PermissionEvent {
  toolName: string;
  argsSummary: string;
  decision: PermissionResult;
  matchedRule?: string;
  timestamp: number;
}

export interface PermissionsConfig {
  autoApprove: string[];
  deny: string[];
  askTimeout: number;
}

export type PromptFn = (
  toolName: string,
  command: string,
) => Promise<PermissionResult>;
