import type { ExecutionPlan } from "./types";
import { executionPlanSchema } from "./types";

export interface ParseResult {
  plan?: ExecutionPlan;
  rawText: string;
  isExecutable: boolean;
  parseError?: string;
}

export function parsePlanOutput(rawOutput: string): ParseResult {
  const trimmed = rawOutput.trim();

  const jsonPlan = extractJson(trimmed);
  if (jsonPlan !== null) {
    const parsed = executionPlanSchema.safeParse(jsonPlan);
    if (parsed.success) {
      return { plan: parsed.data, rawText: trimmed, isExecutable: true };
    }
    return {
      rawText: trimmed,
      isExecutable: false,
      parseError: formatZodError(parsed.error),
    };
  }

  const markdownPlan = extractMarkdownPlan(trimmed);
  if (markdownPlan) {
    const parsed = executionPlanSchema.safeParse(markdownPlan);
    if (parsed.success) {
      return { plan: parsed.data, rawText: trimmed, isExecutable: true };
    }
    return {
      plan: markdownPlan as ExecutionPlan,
      rawText: trimmed,
      isExecutable: false,
      parseError: "Markdown plan missing required fields",
    };
  }

  return {
    rawText: trimmed,
    isExecutable: false,
    parseError: "No JSON or structured plan found in output",
  };
}

function extractJson(text: string): unknown | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = codeBlockMatch ? codeBlockMatch[1].trim() : text;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function extractMarkdownPlan(text: string): Partial<ExecutionPlan> | null {
  const summaryMatch = text.match(/(?:summary|goal|objective)[:]\s*(.+)/im);
  const stepMatches = text.matchAll(
    /(?:step|task)\s*(\d+)[:.\s-]\s*(.+)/gim,
  );
  const fileMatches = text.matchAll(
    /(?:file|affects?)[:]\s*(.+)/gim,
  );
  const riskMatches = text.matchAll(/(?:risk|caveat)[:]\s*(.+)/gim);

  const steps = Array.from(stepMatches);
  const files = Array.from(fileMatches);
  const risks = Array.from(riskMatches);

  if (!summaryMatch && steps.length === 0) return null;

  // Reject plans with summary-only: need at least steps or files or risks
  if (steps.length === 0 && files.length === 0 && risks.length === 0) return null;

  return {
    summary: summaryMatch?.[1]?.trim() ?? "Plan",
    steps:
      steps.length > 0
        ? steps.map(([, order, desc]) => ({
            order: Number(order) || 1,
            description: desc.trim(),
          }))
        : [{ order: 1, description: "Execute plan" }],
    affectedFiles: files.map(([, path]) => path.trim()),
    verification: [],
    risks: risks.map(([, desc]) => desc.trim()),
    assumptions: [],
  };
}

function formatZodError(error: { issues: Array<{ path: Array<string | number>; message: string }> }): string {
  return error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
}

export { extractJson, extractMarkdownPlan };
