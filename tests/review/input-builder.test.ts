import { describe, expect, it } from "vitest";
import { buildReviewInput } from "../../src/review/input-builder";

describe("buildReviewInput", () => {
  it("builds constrained review input from task evidence", () => {
    const input = buildReviewInput({
      taskIntent: "fix auth regression",
      changedFiles: ["src/auth.ts"],
      diff: "diff --git a/src/auth.ts b/src/auth.ts",
      testOutput: "1 failed",
      toolFailures: ["Edit failed: old_string not found"],
      exploreFindings: ["auth flow starts in src/auth.ts"],
      transcript: "assistant secretly changed unrelated billing code",
    });

    expect(input).toEqual({
      taskIntent: "fix auth regression",
      changedFiles: ["src/auth.ts"],
      diff: "diff --git a/src/auth.ts b/src/auth.ts",
      testOutput: "1 failed",
      toolFailures: ["Edit failed: old_string not found"],
      exploreFindings: ["auth flow starts in src/auth.ts"],
    });
    expect("transcript" in input).toBe(false);
  });

  it("truncates large diffs with a visible note", () => {
    const input = buildReviewInput({
      taskIntent: "review large diff",
      changedFiles: ["src/large.ts"],
      diff: "abcdef",
      maxDiffChars: 3,
    });

    expect(input.diff).toBe("abc\n[diff truncated: 3 of 6 characters shown]");
  });
});
