import { createScheduler } from "../scheduling/scheduler";
import { createToolRegistry, registerTool } from "../tools/registry";
import { registerAllTools } from "../tools/index";
import type { ToolCall, ToolResult } from "./types";
import type { PermissionSystem } from "../scheduling/types";

const registry = createToolRegistry();
registerAllTools(registry);

let nextId = 1;

export function dispatchTools(calls: ToolCall[]): Promise<ToolResult[]> {
  const schedulingCalls = calls.map((c) => ({
    name: c.name,
    args: c.args,
    id: nextId++,
  }));

  const permission: PermissionSystem = {
    checkPermission: () => ({ allowed: true }),
  };

  const scheduler = createScheduler(registry, permission);
  return scheduler.dispatchTools(schedulingCalls).then((results) =>
    results.map((r) => ({
      name: r.name,
      success: r.success,
      output: r.output,
      error: r.error,
    })),
  );
}
