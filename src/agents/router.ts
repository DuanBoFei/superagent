import type { RoutingDecision } from "./types";

const FORCED_MARKER = "/multi-agent";
const COMPLEX_PATTERNS = [
  /\b(refactor|feature|bug|fix|integration|orchestration|multi[- ]file|across modules?)\b/i,
  /\b(implement|add|update)\b[\s\S]*\b(files?|modules?|runtime|permission|persistence|observability)\b/i,
];

export function routeMultiAgentPrompt(input: string): RoutingDecision {
  const trimmed = input.trim();
  if (trimmed.startsWith(FORCED_MARKER)) {
    return {
      mode: "multi",
      prompt: trimmed.slice(FORCED_MARKER.length).trim(),
      reason: "forced",
    };
  }

  if (COMPLEX_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { mode: "multi", prompt: input, reason: "complex" };
  }

  return { mode: "single", prompt: input, reason: "simple" };
}
