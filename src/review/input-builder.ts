import type { ReviewInput } from "./types";

export interface ReviewInputEvidence {
  taskIntent: string;
  changedFiles: string[];
  diff?: string;
  testOutput?: string;
  toolFailures?: string[];
  exploreFindings?: string[];
  transcript?: string;
  maxDiffChars?: number;
}

export function buildReviewInput(evidence: ReviewInputEvidence): ReviewInput {
  const input: ReviewInput = {
    taskIntent: evidence.taskIntent,
    changedFiles: evidence.changedFiles,
  };

  if (evidence.diff !== undefined) {
    input.diff = truncateDiff(evidence.diff, evidence.maxDiffChars);
  }
  if (evidence.testOutput !== undefined) {
    input.testOutput = evidence.testOutput;
  }
  if (evidence.toolFailures !== undefined) {
    input.toolFailures = evidence.toolFailures;
  }
  if (evidence.exploreFindings !== undefined) {
    input.exploreFindings = evidence.exploreFindings;
  }

  return input;
}

function truncateDiff(diff: string, maxDiffChars?: number): string {
  if (maxDiffChars === undefined || diff.length <= maxDiffChars) {
    return diff;
  }

  return `${diff.slice(0, maxDiffChars)}\n[diff truncated: ${maxDiffChars} of ${diff.length} characters shown]`;
}
