import type { PermissionSystem, ToolCall as SchedulingToolCall } from "../scheduling/types";
import { createScheduler } from "../scheduling/scheduler";
import { createToolRegistry, registerTool } from "../tools/registry";
import { registerAllTools } from "../tools/index";
import type { ToolRegistry } from "../tools/types";
import { createPreToolUseEvent } from "../hooks/events";
import type { HookManager } from "../hooks";
import type { ToolCall, ToolResult } from "./types";
import { permissionSystem } from "./stubs/permission";

const registry = createToolRegistry();
registerAllTools(registry);

let nextId = 1;

export interface ToolDispatcherOptions {
  registry?: ToolRegistry;
  permission?: PermissionSystem;
  hookManager?: HookManager;
}

export function createToolDispatcher(options: ToolDispatcherOptions = {}) {
  const resolvedRegistry = options.registry ?? registry;
  const resolvedPermission = options.permission ?? permissionSystem;
  const resolvedHookManager = options.hookManager;

  return {
    dispatchTools(calls: ToolCall[]): Promise<ToolResult[]> {
      return dispatchTools(calls, {
        registry: resolvedRegistry,
        permission: resolvedPermission,
        hookManager: resolvedHookManager,
      });
    },
  };
}

export async function dispatchTools(calls: ToolCall[], options: ToolDispatcherOptions = {}): Promise<ToolResult[]> {
  const schedulingCalls = calls.map((c) => ({
    name: c.name,
    args: c.args,
    id: nextId++,
  }));
  const preHookResults = new Map<number, ToolResult>();
  const allowedCalls: SchedulingToolCall[] = [];

  for (const call of schedulingCalls) {
    const hookResult = await options.hookManager?.dispatch(
      "PreToolUse",
      createPreToolUseEvent({
        sessionId: "dispatcher",
        timestamp: new Date().toISOString(),
        cwd: process.cwd(),
        toolName: call.name,
        input: call.args,
        permissionKey: call.name,
      }),
    );

    if (hookResult?.decision === "block") {
      const message = hookResult.message ?? "Tool blocked by hook";
      preHookResults.set(call.id, {
        name: call.name,
        success: false,
        output: message,
        error: message,
      });
      continue;
    }

    allowedCalls.push(call);
  }

  const scheduler = createScheduler(options.registry ?? registry, options.permission ?? permissionSystem);
  const results = allowedCalls.length > 0 ? await scheduler.dispatchTools(allowedCalls) : [];
  for (const result of results) {
    preHookResults.set(result.id, {
      name: result.name,
      success: result.success,
      output: result.output,
      error: result.error,
    });
  }

  return schedulingCalls.map((call) => preHookResults.get(call.id)!);
}
