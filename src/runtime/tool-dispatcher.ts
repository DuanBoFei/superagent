import { ToolCall, ToolResult } from "./types";

function toolCallKey(call: ToolCall): string {
  return `${call.name}:${JSON.stringify(call.args)}`;
}

const DANGEROUS_TOOLS = new Set(["Bash"]);

export async function dispatchTools(calls: ToolCall[]): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  const callCounts = new Map<string, number>();

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i]!;
    const key = toolCallKey(call);
    const count = (callCounts.get(key) ?? 0) + 1;
    callCounts.set(key, count);

    const isDangerous = DANGEROUS_TOOLS.has(call.name);

    let output = `[STUB] ${call.name} executed successfully.`;
    if (!isDangerous) {
      output += ` args: ${JSON.stringify(call.args)}`;
    }

    const result: ToolResult = {
      name: call.name,
      success: !isDangerous,
      output,
    };

    if (isDangerous) {
      result.error = `Dangerous tool "${call.name}" requires permission approval`;
    }

    if (count >= 3) {
      result.output +=
        `\nWARNING: ${call.name} has been called ${count} times with the same arguments. Consider a different approach.`;
    }

    results.push(result);
  }

  return results;
}
