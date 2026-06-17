export const REVIEW_SEVERITIES = ["blocking", "warning", "info"] as const;

export type ReviewSeverity = (typeof REVIEW_SEVERITIES)[number];

export const REVIEW_CATEGORIES = [
  "correctness",
  "tests",
  "security",
  "permissions",
  "overreach",
  "tool-failure-truthfulness",
  "style",
] as const;

export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];

export interface ReviewInput {
  taskIntent: string;
  changedFiles: string[];
  diff?: string;
  testOutput?: string;
  toolFailures?: string[];
  exploreFindings?: string[];
}

export interface ReviewFinding {
  severity: ReviewSeverity;
  category: ReviewCategory;
  description: string;
  recommendation: string;
  file?: string;
  line?: number;
}

export interface ReviewResult {
  approved: boolean;
  summary: string;
  findings: ReviewFinding[];
  rawOutput: string;
}
