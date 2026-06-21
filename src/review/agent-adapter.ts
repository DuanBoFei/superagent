import type { PhaseInput, PhaseResult, ReviewFinding as AgentReviewFinding } from "../agents/types";
import { buildReviewInput } from "./input-builder";
import { runCodeReview } from "./reviewer";
import type { ReviewFinding, ReviewResult } from "./types";
import type { ReviewRequester } from "./reviewer";

export interface RunReviewPhaseOptions {
  requester: ReviewRequester;
}

export async function runReviewPhase(input: PhaseInput, options: RunReviewPhaseOptions): Promise<PhaseResult> {
  const review = await runCodeReview(
    buildReviewInput({
      taskIntent: input.prompt,
      changedFiles: input.changedFiles ?? [],
      testOutput: input.tests?.join("\n"),
      exploreFindings: input.findings,
    }),
    { requester: options.requester },
  );

  return reviewResultToPhaseResult(review);
}

function reviewResultToPhaseResult(review: ReviewResult): PhaseResult {
  return {
    role: "review",
    status: "completed",
    summary: review.summary,
    findings: review.findings.map((finding) => finding.description),
    changedFiles: [],
    tests: [],
    defects: review.findings.map(toAgentFinding),
  };
}

function toAgentFinding(finding: ReviewFinding): AgentReviewFinding {
  return {
    category: toAgentCategory(finding.category),
    description: finding.description,
    priority: finding.severity === "blocking" ? "high" : finding.severity === "warning" ? "medium" : "low",
    file: finding.file,
    line: finding.line,
    blocking: finding.severity === "blocking",
  };
}

function toAgentCategory(category: ReviewFinding["category"]): AgentReviewFinding["category"] {
  if (category === "tests") {
    return "test";
  }
  if (category === "permissions") {
    return "permission";
  }
  if (category === "style" || category === "overreach" || category === "tool-failure-truthfulness") {
    return "maintainability";
  }
  return category;
}
