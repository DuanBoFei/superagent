import { describe, expect, it } from "vitest";
import { buildReviewInput, buildReviewPrompt, parseReviewOutput, runCodeReview } from "../../src/review";

describe("review public exports", () => {
  it("exports the review public API", async () => {
    const input = buildReviewInput({ taskIntent: "check diff", changedFiles: ["src/a.ts"] });
    expect(buildReviewPrompt(input)).toContain("check diff");
    expect(parseReviewOutput(JSON.stringify({ approved: true, summary: "ok", findings: [] })).approved).toBe(true);
    await expect(
      runCodeReview(input, {
        requester: async () => JSON.stringify({ approved: true, summary: "ok", findings: [] }),
      }),
    ).resolves.toMatchObject({ approved: true });
  });
});
