import { describe, expect, it } from "vitest";
import { parseReviewOutput } from "../../src/review/parser";

describe("parseReviewOutput", () => {
  it("parses an approved JSON review result", () => {
    const result = parseReviewOutput(
      JSON.stringify({ approved: true, summary: "Looks good", findings: [] }),
    );

    expect(result).toEqual({
      approved: true,
      summary: "Looks good",
      findings: [],
      rawOutput: '{"approved":true,"summary":"Looks good","findings":[]}',
    });
  });

  it("parses blocking findings from JSON", () => {
    const result = parseReviewOutput(
      JSON.stringify({
        approved: false,
        summary: "Failed tests remain",
        findings: [
          {
            severity: "blocking",
            category: "tests",
            description: "Test output reports one failure",
            recommendation: "Fix the failing test before approval",
            file: "tests/auth.test.ts",
            line: 42,
          },
        ],
      }),
    );

    expect(result.approved).toBe(false);
    expect(result.findings).toEqual([
      {
        severity: "blocking",
        category: "tests",
        description: "Test output reports one failure",
        recommendation: "Fix the failing test before approval",
        file: "tests/auth.test.ts",
        line: 42,
      },
    ]);
  });

  it("treats empty output as an inconclusive blocking result", () => {
    expect(parseReviewOutput("   ")).toEqual({
      approved: false,
      summary: "Reviewer output was empty",
      findings: [
        {
          severity: "blocking",
          category: "correctness",
          description: "Reviewer output was empty, so approval cannot be trusted",
          recommendation: "Run review again and require structured output",
        },
      ],
      rawOutput: "   ",
    });
  });

  it("treats malformed JSON as an inconclusive blocking result", () => {
    const result = parseReviewOutput("{ not json");

    expect(result.approved).toBe(false);
    expect(result.summary).toBe("Reviewer output was malformed");
    expect(result.findings[0]).toMatchObject({
      severity: "blocking",
      category: "correctness",
      description: "Reviewer output could not be parsed as JSON or fallback findings",
    });
  });

  it("falls back to parsing simple text finding lists", () => {
    const result = parseReviewOutput("BLOCKING tests: Failing auth test remains");

    expect(result).toEqual({
      approved: false,
      summary: "Parsed 1 fallback finding",
      findings: [
        {
          severity: "blocking",
          category: "tests",
          description: "Failing auth test remains",
          recommendation: "Address the reported tests issue",
        },
      ],
      rawOutput: "BLOCKING tests: Failing auth test remains",
    });
  });
});
