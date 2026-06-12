import { PermissionResult } from "../types";

export function checkPermission(
  toolName: string,
  _args: Record<string, unknown>,
): PermissionResult {
  console.debug(`[STUB] checkPermission called for ${toolName}`);
  return { allowed: true };
}
