import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  AgentRole,
  OrchestrationRun,
  PhaseResult,
  PhaseStatus,
  ReviewFinding,
} from "../../src/agents/types";

describe("agent orchestration domain types", () => {
  it("models the built-in serial roles", () => {
    const roles: AgentRole[] = ["explore", "implement", "review"];

    expect(roles).toEqual(["explore", "implement", "review"]);
  });

  it("models phase results with summaries and role-specific outputs", () => {
    const finding: ReviewFinding = {
      category: "correctness",
      description: "Missing assertion for empty input",
      priority: "high",
      blocking: true,
    };
    const result: PhaseResult = {
      role: "review",
      status: "completed",
      summary: "Review found one blocker",
      findings: ["Checked diff summary"],
      changedFiles: ["src/example.ts"],
      tests: ["pnpm test -- tests/example.test.ts"],
      defects: [finding],
    };

    expect(result.defects?.[0]?.blocking).toBe(true);
    expectTypeOf(result.status).toMatchTypeOf<PhaseStatus>();
  });

  it("models a serial orchestration run", () => {
    const run: OrchestrationRun = {
      id: "run-020",
      prompt: "fix auth flow",
      status: "running",
      phases: [
        {
          role: "explore",
          status: "completed",
          summary: "Found auth files",
          findings: ["src/auth.ts handles login"],
        },
      ],
      startedAt: new Date("2026-06-17T00:00:00.000Z"),
      updatedAt: new Date("2026-06-17T00:00:01.000Z"),
    };

    expect(run.phases[0]?.role).toBe("explore");
    expect(run.status).toBe("running");
  });
});
