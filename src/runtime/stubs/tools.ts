import { createToolRegistry, getTool } from "../../tools/registry";
import { registerAllTools } from "../../tools/index";
import type { ToolContext } from "../../tools/types";
import { ToolCall, ToolResult } from "../types";

const registry = createToolRegistry();
registerAllTools(registry);
const runtimeContext: ToolContext = {
  workingDirectory: process.cwd(),
  sessionId: "runtime",
};

export async function dispatchTools(
  calls: ToolCall[],
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  for (const call of calls) {
    const tool = getTool(registry, call.name);
    if (!tool) {
      results.push({
        name: call.name,
        success: false,
        output: "",
        error: `Unknown tool: ${call.name}`,
      });
      continue;
    }

    const result = await tool.fn(call.args, runtimeContext);
    results.push({
      name: call.name,
      success: !result.error,
      output: result.output,
      error: result.error,
    });
  }
  return results;
}
