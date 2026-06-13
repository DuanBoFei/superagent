import type { ToolDef } from "./types";

export function formatToolDefs(tools: ToolDef[]): string {
  if (tools.length === 0) return "";

  const lines: string[] = ["## Available Tools", ""];

  for (const tool of tools) {
    lines.push(`### ${tool.name}`);
    lines.push(`${tool.description}`);

    const paramKeys = Object.keys(tool.parameters);
    if (paramKeys.length > 0) {
      lines.push("Parameters:");
      for (const key of paramKeys) {
        const param = tool.parameters[key];
        if (typeof param === "object" && param !== null && "type" in param) {
          const p = param as Record<string, unknown>;
          const required = p.required ? " (required)" : "";
          lines.push(`  - ${key}: ${p.type}${required} — ${p.description || ""}`);
        }
      }
    }

    if (tool.concurrencySafe) {
      lines.push("[safe for parallel execution]");
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
