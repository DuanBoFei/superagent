import type { ToolRegistry } from "../tools/types";
import type { BatchPlan, PermissionSystem, ToolCall, ToolResult } from "./types";
import { partition } from "./partitioner";
import { executeBatch } from "./executor";

const MAX_BATCH_SIZE = 8;

export function createScheduler(
  registry: ToolRegistry,
  permission: PermissionSystem,
) {
  return {
    async dispatchTools(calls: ToolCall[]): Promise<ToolResult[]> {
      if (calls.length > MAX_BATCH_SIZE) {
        const kept = calls.slice(0, MAX_BATCH_SIZE);
        const skipped = calls.slice(MAX_BATCH_SIZE);
        const plan = partition(kept, registry);
        const results = await executeBatch(plan, registry, permission);
        for (const call of skipped) {
          results.push({
            id: call.id,
            name: call.name,
            success: false,
            output: "",
            error: "Skipped: batch size limit exceeded",
          });
        }
        return results;
      }
      const plan = partition(calls, registry);
      return executeBatch(plan, registry, permission);
    },
  };
}
