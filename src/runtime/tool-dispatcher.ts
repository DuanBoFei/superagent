import { createScheduler } from "../scheduling/scheduler";
import { createToolRegistry, registerTool } from "../tools/registry";
import { registerAllTools } from "../tools/index";
import type { ToolCall, ToolResult } from "./types";
import { permissionSystem } from "./stubs/permission";

const registry = createToolRegistry();
registerAllTools(registry);

let nextId = 1;

export function dispatchTools(calls: ToolCall[]): Promise<ToolResult[]> {
  const schedulingCalls = calls.map((c) => ({
    name: c.name,
    args: c.args,
    id: nextId++,
  }));

  const scheduler = createScheduler(registry, permissionSystem);
  return scheduler.dispatchTools(schedulingCalls).then((results) =>
    results.map((r) => ({
      name: r.name,
      success: r.success,
      output: r.output,
      error: r.error,
    })),
  );
}
