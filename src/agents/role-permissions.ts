import type { PermissionSystem } from "../scheduling/types";
import type { AgentRole } from "./types";

const READ_ONLY_TOOLS = new Set(["Read", "Grep", "Glob", "WebSearch"]);
const MUTATING_TOOLS = new Set(["Write", "Edit", "Bash", "Browser"]);

export function createRolePermissionSystem(
  role: AgentRole,
  basePermission: PermissionSystem,
): PermissionSystem {
  return {
    async checkPermission(toolName, args) {
      if (role === "implement") {
        return basePermission.checkPermission(toolName, args);
      }

      if (MUTATING_TOOLS.has(toolName)) {
        return "denied";
      }

      if (READ_ONLY_TOOLS.has(toolName) || toolName.startsWith("mcp__")) {
        return basePermission.checkPermission(toolName, args);
      }

      return "denied";
    },
  };
}
