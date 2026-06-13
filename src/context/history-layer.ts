import type { ContextMessage } from "./types";

const TOOL_RESULT_TRIM_LIMIT = 10_000;
const TRIM_NOTE =
  "\n[Output trimmed from {before} to {after} chars. First 5K + last 5K shown.]";

export function buildHistory(messages: ContextMessage[]): string {
  if (messages.length === 0) return "";

  const parts: string[] = [];

  for (const msg of messages) {
    parts.push(`[${msg.role}]`);

    if (msg.toolResults && msg.toolResults.length > 0) {
      parts.push(msg.content);
      for (const tr of msg.toolResults) {
        const output = trimOutput(tr.output);
        parts.push(`  [Tool: ${tr.name}] ${output}`);
      }
    } else {
      parts.push(msg.content);
    }

    parts.push("");
  }

  return parts.join("\n");
}

function trimOutput(output: string): string {
  if (output.length <= TOOL_RESULT_TRIM_LIMIT) return output;

  const before = output.slice(0, 5_000);
  const after = output.slice(-5_000);
  const note = TRIM_NOTE.replace("{before}", String(output.length)).replace(
    "{after}",
    String(10_000),
  );

  return before + note + "\n" + after;
}
