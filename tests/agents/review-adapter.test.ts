import { describe, expect, it, vi } from "vitest";
import { runReviewPhase } from "../../src/review/agent-adapter";
import type { ReviewRequester } from "../../src/review/reviewer";

describe("runReviewPhase", () => {
  it("adapts 020 review phase input into code review result defects", async () => {
    const requester = vi.fn<ReviewRequester>().mockResolvedValue(
      JSON.stringify({
        approved: false,
        summary: "Review blocked",
        findings: [
          {
            severity: "blocking",
            category: "tests",
            description: "Failing auth test remains",
            recommendation: "Fix test failure",
            file: "tests/auth.test.ts",
            line: 7,
          },
        ],
      }),
    );

    const result = await runReviewPhase(
      {
        role: "review",
        prompt: "fix auth",
        findings: ["auth flow in src/auth.ts"],
        changedFiles: ["src/auth.ts"],
        tests: ["1 failed"],
      },
      { requester },
    );

    expect(result).toMatchObject({
      role: "review",
      status: "completed",
      summary: "Review blocked",
      defects: [
        {
          category: "test",
          description: "Failing auth test remains",
          priority: "high",
          file: "tests/auth.test.ts",
          line: 7,
          blocking: true,
        },
      ],
    });
    expect(requester.mock.calls[0]?.[0]).toContain("fix auth");
    expect(requester.mock.calls[0]?.[0]).toContain("1 failed");
  });
});
