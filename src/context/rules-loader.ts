import { readFileSync } from "node:fs";

export function loadRules(filePath: string): string {
  try {
    const content = readFileSync(filePath, "utf-8");
    if (content.length > 50_000) {
      const trimmed = content.slice(0, 50_000);
      console.warn(
        `CLAUDE.md too large (${content.length} bytes), truncated to 50KB`,
      );
      return `## Project Rules\n${trimmed}`;
    }
    return `## Project Rules\n${content}`;
  } catch {
    return "";
  }
}
