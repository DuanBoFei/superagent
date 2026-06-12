import { ToolCall, ToolResult } from "../types";

export async function dispatchTools(
  calls: ToolCall[],
): Promise<ToolResult[]> {
  console.debug("[STUB] dispatchTools called");
  return calls.map((call) => ({
    name: call.name,
    success: true,
    output: `[STUB] ${call.name} result`,
  }));
}
