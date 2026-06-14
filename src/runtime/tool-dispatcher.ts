import type { PermissionSystem } from "../scheduling/types";
import { createScheduler } from "../scheduling/scheduler";
import { createToolRegistry, registerTool } from "../tools/registry";
import { registerAllTools } from "../tools/index";
import type { ToolRegistry } from "../tools/types";
import type { ToolCall, ToolResult } from "./types";
import { permissionSystem } from "./stubs/permission";

const registry = createToolRegistry();
registerAllTools(registry);

let nextId = 1;

export interface ToolDispatcherOptions {
  registry?: ToolRegistry;
  permission?: PermissionSystem;
}

export function createToolDispatcher(options: ToolDispatcherOptions = {}) {
  const resolvedRegistry = options.registry ?? registry;
  const resolvedPermission = options.permission ?? permissionSystem;

  return {
    dispatchTools(calls: ToolCall[]): Promise<ToolResult[]> {
      return dispatchTools(calls, {
        registry: resolvedRegistry,
        permission: resolvedPermission,
      });
    },
  };
}

export function dispatchTools(calls: ToolCall[], options: ToolDispatcherOptions = {}): Promise<ToolResult[]> {
  const schedulingCalls = calls.map((c) => ({
    name: c.name,
    args: c.args,
    id: nextId++,
  }));

  const scheduler = createScheduler(options.registry ?? registry, options.permission ?? permissionSystem);
  return scheduler.dispatchTools(schedulingCalls).then((results) =>
    results.map((r) => ({
      name: r.name,
      success: r.success,
      output: r.output,
      error: r.error,
    })),
  );
}
