import type { ReviewInput } from "./types";

export function buildReviewPrompt(input: ReviewInput): string {
  const lines = [
    "You are the Code Review Agent.",
    "Review the provided task evidence for correctness, tests, security, permissions, overreach, tool-failure truthfulness, and style.",
    "Do not write files, edit files, or run shell commands.",
    "Failed tests must be reported as blocking unless the evidence explicitly marks them unrelated.",
    'Return only JSON matching this shape: { "approved": boolean, "summary": string, "findings": [{ "severity": "blocking" | "warning" | "info", "category": string, "description": string, "recommendation": string, "file"?: string, "line"?: number }] }.',
    "Use approved=false whenever blocking findings exist or evidence is inconclusive.",
    "",
    "Task intent:",
    input.taskIntent,
    "",
    "Changed files:",
    ...input.changedFiles.map((file) => `- ${file}`),
  ];

  if (input.exploreFindings && input.exploreFindings.length > 0) {
    lines.push("", "Explore findings:", ...input.exploreFindings.map((finding) => `- ${finding}`));
  }

  if (input.diff) {
    lines.push("", "Diff:", input.diff);
  }

  if (input.testOutput) {
    lines.push("", "Test output:", input.testOutput);
  }

  if (input.toolFailures && input.toolFailures.length > 0) {
    lines.push("", "Tool failures:", ...input.toolFailures.map((failure) => `- ${failure}`));
  }

  return lines.join("\n");
}
