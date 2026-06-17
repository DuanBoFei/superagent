import { describe, expect, it } from "vitest";
import {
  REVIEW_CATEGORIES,
  REVIEW_SEVERITIES,
  type ReviewCategory,
  type ReviewFinding,
  type ReviewInput,
  type ReviewResult,
  type ReviewSeverity,
} from "../../src/review/types";

describe("code review contracts", () => {
  it("exports stable severity and category lists", () => {
    expect(REVIEW_SEVERITIES).toEqual(["blocking", "warning", "info"]);
    expect(REVIEW_CATEGORIES).toEqual([
      "correctness",
      "tests",
      "security",
      "permissions",
      "overreach",
      "tool-failure-truthfulness",
      "style",
    ]);
  });

  it("defines review input evidence without implementer transcript", () => {
    const input: ReviewInput = {
      taskIntent: "fix auth regression",
      changedFiles: ["src/auth.ts"],
      diff: "diff --git a/src/auth.ts b/src/auth.ts",
      testOutput: "1 failed",
      toolFailures: ["Edit failed: old_string not found"],
      exploreFindings: ["auth flow starts in src/auth.ts"],
    };

    expect(input).toMatchObject({
      taskIntent: "fix auth regression",
      changedFiles: ["src/auth.ts"],
    });
    expect("transcript" in input).toBe(false);
  });

  it("defines findings and result categories", () => {
    const severity: ReviewSeverity = "blocking";
    const category: ReviewCategory = "tool-failure-truthfulness";
    const finding: ReviewFinding = {
      severity,
      category,
      description: "Reported success after a failed edit",
      recommendation: "Retry the edit or report the failure",
      file: "src/auth.ts",
      line: 12,
    };
    const result: ReviewResult = {
      approved: false,
      summary: "Blocking issue found",
      findings: [finding],
      rawOutput: "{}",
    };

    expect(result).toEqual({
      approved: false,
      summary: "Blocking issue found",
      findings: [finding],
      rawOutput: "{}",
    });
  });
});
