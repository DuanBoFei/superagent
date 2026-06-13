import type { ToolRegistry } from "../tools/types";
import type { BatchPlan, ToolCall } from "./types";

export function partition(
  calls: ToolCall[],
  registry: ToolRegistry,
): BatchPlan {
  const concurrent: ToolCall[] = [];
  const serial: ToolCall[] = [];

  for (const call of calls) {
    if (registry.has(call.name) && (registry.get(call.name)?.concurrencySafe ?? false)) {
      concurrent.push(call);
    } else {
      serial.push(call);
    }
  }

  return { concurrent, serial };
}
