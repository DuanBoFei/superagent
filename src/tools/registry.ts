import type { z } from "zod";
import type { McpManager } from "../mcp/manager";
import { adaptMcpTool, type McpToolAdapterOptions } from "../mcp/tool-adapter";
import type {
  RegisteredTool,
  ToolFunction,
  ToolRegistry,
} from "./types";

export function createToolRegistry(): ToolRegistry {
  return new Map();
}

export function registerTool(
  registry: ToolRegistry,
  name: string,
  fn: ToolFunction,
  schema: z.ZodSchema,
  concurrencySafe: boolean,
): void {
  registry.set(name, { name, fn, schema, concurrencySafe });
}

export function getTool(
  registry: ToolRegistry,
  name: string,
): RegisteredTool | undefined {
  return registry.get(name);
}

export function listTools(registry: ToolRegistry): RegisteredTool[] {
  return Array.from(registry.values());
}

export function clearMcpTools(registry: ToolRegistry): void {
  for (const name of registry.keys()) {
    if (name.startsWith("mcp__")) {
      registry.delete(name);
    }
  }
}

export function registerMcpTools(
  registry: ToolRegistry,
  manager: McpManager,
  options: McpToolAdapterOptions = {},
): void {
  const tools = manager
    .listTools()
    .filter((tool) => tool.isAvailable)
    .sort((left, right) => left.permissionKey.localeCompare(right.permissionKey));

  for (const tool of tools) {
    const registered = adaptMcpTool(tool, manager, options);
    registry.set(registered.name, registered);
  }
}

export function isConcurrencySafe(
  registry: ToolRegistry,
  name: string,
): boolean {
  return registry.get(name)?.concurrencySafe ?? false;
}
