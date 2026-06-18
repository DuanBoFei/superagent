import { createChecker } from "../../permissions/checker";
import type { PromptFn } from "../../permissions/types";
import type { PermissionResult } from "../types";

const promptFn: PromptFn = async (_toolName, _command) => "denied";

const checker = createChecker(
  {
    autoApprove: ["Read:*", "Grep:*", "Glob:*", "WebSearch:*"],
    deny: [],
    askTimeout: 30000,
  },
  promptFn,
);

export const permissionSystem = checker;

export function checkPermission(
  toolName: string,
  _args: Record<string, unknown>,
): PermissionResult {
  return { allowed: true };
}
