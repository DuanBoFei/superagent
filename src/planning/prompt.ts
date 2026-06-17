import type { PlannerPrompt } from "./types";

export function buildPlannerPrompt(task: string): PlannerPrompt {
  const system = [
    "You are a planning assistant for a coding agent. Your job is to create a clear, executable plan.",
    "",
    "Output a JSON object with this exact structure:",
    '{',
    '  "summary": "<one-line description>",',
    '  "steps": [',
    '    {"order": 1, "description": "<step>", "file": "<optional file path>", "verification": "<optional verification>"}',
    "  ],",
    '  "affectedFiles": ["<file path>"],',
    '  "verification": ["<command or check>"],',
    '  "risks": ["<risk description>"],',
    '  "assumptions": ["<optional assumption>"]',
    "}",
    "",
    "Rules:",
    "- summary: concise one-line description of the task.",
    "- steps: ordered list. Each step has order, description. file and verification are optional.",
    "- affectedFiles: every file the plan expects to touch.",
    "- verification: commands or checks to confirm each step succeeded.",
    "- risks: things that could go wrong or need attention.",
    "- assumptions: what you assume is already true (optional).",
    "",
    "Do NOT include destructive commands (rm -rf, drop table, git push --force, sudo).",
    "If the task requires destructive operations, note them in risks but use safe alternatives.",
  ].join("\n");

  const user = `Task: ${task}\n\nCreate a plan following the format above. Output ONLY the JSON object.`;

  return { system, user };
}
