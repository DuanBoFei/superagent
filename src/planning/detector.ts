import type { DetectorInput, PlanDecision } from "./types";
import { PlanDecision as PD } from "./types";

const COMPLEX_KEYWORDS = [
  "refactor",
  "migrate",
  "restructure",
  "overhaul",
  "redesign",
  "rewrite",
  "rearchitect",
];

const RISKY_OPERATIONS = [
  /delete\s+(all|every|entire)\b/i,
  /drop\s+(table|database|collection)\b/i,
  /rm\s+-rf\b/i,
  /git\s+push\s+--force/i,
  /truncate\b/i,
  /sudo\b/i,
  /chmod\s+777\b/i,
  /eval\b/i,
  /\bcurl\b.+\|\s*(ba)?sh\b/i,
];

function hasComplexKeyword(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return COMPLEX_KEYWORDS.some((kw) => lower.includes(kw));
}

function hasRiskyOperation(prompt: string): boolean {
  return RISKY_OPERATIONS.some((re) => re.test(prompt));
}

function isSimpleReadOnly(prompt: string): boolean {
  const lower = prompt.trim().toLowerCase();
  const simplePrefixes = [
    "what ",
    "how ",
    "explain ",
    "show ",
    "list ",
    "find ",
    "where ",
    "who ",
    "when ",
    "why ",
  ];
  if (!simplePrefixes.some((p) => lower.startsWith(p))) return false;
  if (hasComplexKeyword(prompt)) return false;
  if (hasRiskyOperation(prompt)) return false;
  return true;
}

export function detectPlanMode(input: DetectorInput): PlanDecision {
  if (input.hasPlanPrefix) {
    return PD.PlanRequested;
  }

  if (hasRiskyOperation(input.userPrompt)) {
    return PD.PlanRequired;
  }

  if (hasComplexKeyword(input.userPrompt) && !isSimpleReadOnly(input.userPrompt)) {
    return PD.PlanRequired;
  }

  return PD.Direct;
}

export function hasPlanPrefix(prompt: string): boolean {
  return /^\/plan\b/i.test(prompt.trim());
}

export function stripPlanPrefix(prompt: string): string {
  return prompt.trim().replace(/^\/plan\s*/i, "");
}

export { COMPLEX_KEYWORDS, RISKY_OPERATIONS, isSimpleReadOnly };
