export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  id: number;
}

export interface ToolResult {
  id: number;
  name: string;
  output: string;
  error?: string;
  success: boolean;
}

export interface BatchPlan {
  concurrent: ToolCall[];
  serial: ToolCall[];
}

export interface PermissionSystem {
  checkPermission(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<"approved" | "denied" | "always">;
}
