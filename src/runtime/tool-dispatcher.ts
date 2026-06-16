import type { PermissionSystem, ToolCall as SchedulingToolCall } from "../scheduling/types";
import { createScheduler } from "../scheduling/scheduler";
import { createToolRegistry, registerTool } from "../tools/registry";
import { registerAllTools } from "../tools/index";
import type { ToolContext, ToolRegistry } from "../tools/types";
import { createPostToolUseEvent, createPostToolUseFailureEvent, createPreToolUseEvent } from "../hooks/events";
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
  toolContext?: Partial<ToolContext>;
}

export function createToolDispatcher(options: ToolDispatcherOptions = {}) {
  const resolvedRegistry = options.registry ?? registry;
  const resolvedPermission = options.permission ?? permissionSystem;
  const resolvedHookManager = options.hookManager;
  const resolvedToolContext = options.toolContext;

  return {
    dispatchTools(calls: ToolCall[]): Promise<ToolResult[]> {
      return dispatchTools(calls, {
        registry: resolvedRegistry,
        permission: resolvedPermission,
        hookManager: resolvedHookManager,
        toolContext: resolvedToolContext,
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
  const allowedCalls = new Map<number, SchedulingToolCall>();

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

    allowedCalls.set(call.id, call);
  }

  const scheduler = createScheduler(options.registry ?? registry, options.permission ?? permissionSystem, options.toolContext);
  const results = allowedCalls.size > 0 ? await scheduler.dispatchTools([...allowedCalls.values()]) : [];
  for (const result of results) {
    const toolResult = {
      name: result.name,
      success: result.success,
      output: result.output,
      error: result.error,
    };
    preHookResults.set(result.id, toolResult);

    const call = allowedCalls.get(result.id)!;
    if (result.success) {
      await options.hookManager?.dispatch(
        "PostToolUse",
        createPostToolUseEvent({
          sessionId: "dispatcher",
          timestamp: new Date().toISOString(),
          cwd: process.cwd(),
          toolName: result.name,
          input: call.args,
          permissionKey: result.name,
          result: toolResult,
        }),
      );
    } else {
      await options.hookManager?.dispatch(
        "PostToolUseFailure",
        createPostToolUseFailureEvent({
          sessionId: "dispatcher",
          timestamp: new Date().toISOString(),
          cwd: process.cwd(),
          toolName: result.name,
          input: call.args,
          permissionKey: result.name,
          error: result.error ?? "Tool failed",
        }),
      );
    }
  }

  return schedulingCalls.map((call) => preHookResults.get(call.id)!);
}
