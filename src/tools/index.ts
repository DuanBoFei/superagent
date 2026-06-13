import { bashTool, bashToolSchema } from "./bash";
import { editTool, editToolSchema } from "./edit";
import { globTool, globToolSchema } from "./glob";
import { grepTool, grepToolSchema } from "./grep";
import { readTool, readToolSchema } from "./read";
import { registerTool } from "./registry";
import { taskTool, taskToolSchema } from "./task";
import type { ToolRegistry } from "./types";
import { webSearchTool, webSearchToolSchema } from "./web-search";
import { writeTool, writeToolSchema } from "./write";

export function registerAllTools(registry: ToolRegistry): void {
  registerTool(registry, "Read", readTool, readToolSchema, true);
  registerTool(registry, "Write", writeTool, writeToolSchema, false);
  registerTool(registry, "Edit", editTool, editToolSchema, false);
  registerTool(registry, "Bash", bashTool, bashToolSchema, false);
  registerTool(registry, "Grep", grepTool, grepToolSchema, true);
  registerTool(registry, "Glob", globTool, globToolSchema, true);
  registerTool(registry, "Task", taskTool, taskToolSchema, true);
  registerTool(registry, "WebSearch", webSearchTool, webSearchToolSchema, true);
}
