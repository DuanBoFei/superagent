import { createScheduler } from "../../scheduling/scheduler";
import { createToolRegistry } from "../../tools/registry";
import { registerAllTools } from "../../tools/index";
import type { ToolCall, ToolResult } from "../types";
import type { PermissionSystem } from "../../scheduling/types";

const registry = createToolRegistry();
registerAllTools(registry);

let nextId = 1;

const permission: PermissionSystem = {
  checkPermission: () => ({ allowed: true }),
};

export async function dispatchTools(
  calls: ToolCall[],
): Promise<ToolResult[]> {
  const scheduler = createScheduler(registry, permission);
  const schedulingCalls = calls.map((c) => ({
    name: c.name,
    args: c.args,
    id: nextId++,
  }));
  const results = await scheduler.dispatchTools(schedulingCalls);
  return results.map((r) => ({
    name: r.name,
    success: r.success,
    output: r.output,
    error: r.error,
  }));
}
