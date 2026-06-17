import { describe, expect, it } from "vitest";
import { buildReviewPrompt } from "../../src/review/prompt";
import type { ReviewInput } from "../../src/review/types";

const input: ReviewInput = {
  taskIntent: "fix auth regression",
  changedFiles: ["src/auth.ts"],
  diff: "diff --git a/src/auth.ts b/src/auth.ts",
  testOutput: "1 failed",
  toolFailures: ["Edit failed: old_string not found"],
  exploreFindings: ["auth flow starts in src/auth.ts"],
};

describe("buildReviewPrompt", () => {
  it("builds a read-only structured review prompt", () => {
    const prompt = buildReviewPrompt(input);

    expect(prompt).toContain("You are the Code Review Agent.");
    expect(prompt).toContain("Do not write files, edit files, or run shell commands.");
    expect(prompt).toContain("Return only JSON");
    expect(prompt).toContain('"approved"');
    expect(prompt).toContain('"findings"');
    expect(prompt).toContain("fix auth regression");
    expect(prompt).toContain("src/auth.ts");
    expect(prompt).toContain("1 failed");
    expect(prompt).not.toContain("transcript");
  });

  it("keeps a stable prompt snapshot", () => {
    expect(buildReviewPrompt(input)).toMatchInlineSnapshot(`
      "You are the Code Review Agent.
      Review the provided task evidence for correctness, tests, security, permissions, overreach, tool-failure truthfulness, and style.
      Do not write files, edit files, or run shell commands.
      Failed tests must be reported as blocking unless the evidence explicitly marks them unrelated.
      Return only JSON matching this shape: { \"approved\": boolean, \"summary\": string, \"findings\": [{ \"severity\": \"blocking\" | \"warning\" | \"info\", \"category\": string, \"description\": string, \"recommendation\": string, \"file\"?: string, \"line\"?: number }] }.
      Use approved=false whenever blocking findings exist or evidence is inconclusive.

      Task intent:
      fix auth regression

      Changed files:
      - src/auth.ts

      Explore findings:
      - auth flow starts in src/auth.ts

      Diff:
      diff --git a/src/auth.ts b/src/auth.ts

      Test output:
      1 failed

      Tool failures:
      - Edit failed: old_string not found"
    `);
  });
});
