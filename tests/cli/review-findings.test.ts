import { describe, expect, it } from "vitest";
import { renderReviewFindingsTable } from "../../src/cli/review-findings";
import type { ReviewFinding } from "../../src/review/types";

describe("renderReviewFindingsTable", () => {
  it("renders review findings as a compact table", () => {
    const findings: ReviewFinding[] = [
      {
        severity: "blocking",
        category: "tests",
        description: "Auth test still fails",
        recommendation: "Fix the failing test",
        file: "tests/auth.test.ts",
        line: 12,
      },
    ];

    expect(renderReviewFindingsTable(findings)).toBe(
      "| Severity | Category | Location | Description | Recommendation |\n" +
        "|---|---|---|---|---|\n" +
        "| blocking | tests | tests/auth.test.ts:12 | Auth test still fails | Fix the failing test |",
    );
  });

  it("renders no findings clearly", () => {
    expect(renderReviewFindingsTable([])).toBe("No review findings.");
  });
});
