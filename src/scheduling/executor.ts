import type { ToolContext, ToolRegistry } from "../tools/types";
import type { BatchPlan, PermissionSystem, ToolResult } from "./types";

const MAX_CONCURRENCY = 5;

export async function executeBatch(
  plan: BatchPlan,
  registry: ToolRegistry,
  permission: PermissionSystem,
  toolContext?: Partial<ToolContext>,
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  // Step 1: Execute concurrent group in batches of 5
  const concurrent = plan.concurrent;
  for (let i = 0; i < concurrent.length; i += MAX_CONCURRENCY) {
    const chunk = concurrent.slice(i, i + MAX_CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map((call) => executeOne(call, registry, permission, toolContext)),
    );
    for (const s of settled) {
      results.push(
        s.status === "fulfilled" ? s.value : makeError(s.reason),
      );
    }
  }

  // Step 2: Execute serial group sequentially; stop on first failure
  let serialFailed = false;
  for (const call of plan.serial) {
    if (serialFailed) {
      results.push({
        id: call.id,
        name: call.name,
        success: false,
        output: "",
        error: "Skipped: previous tool failed",
      });
      continue;
    }
    const result = await executeOne(call, registry, permission, toolContext);
    if (!result.success) {
      serialFailed = true;
    }
    results.push(result);
  }

  return results;
}

async function executeOne(
  call: { name: string; args: Record<string, unknown>; id: number },
  registry: ToolRegistry,
  permission: PermissionSystem,
  toolContext?: Partial<ToolContext>,
): Promise<ToolResult> {
  const tool = registry.get(call.name);
  if (!tool) {
    return {
      id: call.id,
      name: call.name,
      success: false,
      output: "",
      error: `Unknown tool: ${call.name}`,
    };
  }

  const perm = await permission.checkPermission(call.name, call.args);
  if (perm !== "approved" && perm !== "always") {
    return {
      id: call.id,
      name: call.name,
      success: false,
      output: "",
      error: "Permission denied",
    };
  }

  try {
    const toolResult = await tool.fn(call.args, {
      workingDirectory: process.cwd(),
      sessionId: "scheduler",
      ...toolContext,
    });
    return {
      id: call.id,
      name: call.name,
      output: toolResult.output,
      error: toolResult.error,
      success: !toolResult.error,
    };
  } catch (err) {
    if (err instanceof Error) {
      return {
        id: call.id,
        name: call.name,
        success: false,
        output: "",
        error: `Tool execution error: ${err.message}`,
      };
    }
    throw err;
  }
}

function makeError(reason: unknown): ToolResult {
  const msg = reason instanceof Error ? reason.message : String(reason);
  return { id: -1, name: "unknown", success: false, output: "", error: msg };
}
