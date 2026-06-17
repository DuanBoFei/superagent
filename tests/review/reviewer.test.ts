import { describe, expect, it, vi } from "vitest";
import { runCodeReview, type ReviewRequester } from "../../src/review/reviewer";
import type { ReviewInput } from "../../src/review/types";

const input: ReviewInput = {
  taskIntent: "fix auth regression",
  changedFiles: ["src/auth.ts"],
  diff: "diff --git a/src/auth.ts b/src/auth.ts",
};

describe("runCodeReview", () => {
  it("returns approved response from requester output", async () => {
    const requester = vi.fn<ReviewRequester>().mockResolvedValue(
      JSON.stringify({ approved: true, summary: "Looks good", findings: [] }),
    );

    await expect(runCodeReview(input, { requester })).resolves.toMatchObject({
      approved: true,
      summary: "Looks good",
      findings: [],
    });
    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester.mock.calls[0]?.[0]).toContain("fix auth regression");
  });

  it("returns blocking findings from requester output", async () => {
    const requester = vi.fn<ReviewRequester>().mockResolvedValue(
      JSON.stringify({
        approved: false,
        summary: "Issue found",
        findings: [
          {
            severity: "blocking",
            category: "correctness",
            description: "Auth result is inverted",
            recommendation: "Restore success condition",
          },
        ],
      }),
    );

    await expect(runCodeReview(input, { requester })).resolves.toMatchObject({
      approved: false,
      findings: [
        expect.objectContaining({
          severity: "blocking",
          category: "correctness",
        }),
      ],
    });
  });

  it("does not approve malformed requester output", async () => {
    const requester = vi.fn<ReviewRequester>().mockResolvedValue("not structured");

    await expect(runCodeReview(input, { requester })).resolves.toMatchObject({
      approved: false,
      summary: "Reviewer output was malformed",
      findings: [expect.objectContaining({ severity: "blocking" })],
    });
  });
});
