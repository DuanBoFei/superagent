import { describe, expect, it, vi } from "vitest";
import {
  runMultiAgentOrchestration,
  serializePhaseSummary,
  type PhaseRunner,
} from "../../src/agents/orchestrator";
import type { AgentRole, PhaseInput, PhaseResult } from "../../src/agents/types";

function completed(role: AgentRole, extra: Partial<PhaseResult> = {}): PhaseResult {
  return {
    role,
    status: "completed",
    summary: `${role} complete`,
    findings: role === "explore" ? [`${role} finding`] : undefined,
    ...extra,
  };
}

describe("multi-agent orchestrator", () => {
  it("runs Explore, Implement, and Review in serial order", async () => {
    const inputs: PhaseInput[] = [];
    const runner: PhaseRunner = vi.fn(async (input) => {
      inputs.push(input);
      return completed(input.role);
    });

    const run = await runMultiAgentOrchestration("fix bug", { runId: "run-1", runPhase: runner });

    expect(run.status).toBe("completed");
    expect(run.phases.map((phase) => phase.role)).toEqual(["explore", "implement", "review"]);
    expect(inputs.map((input) => input.role)).toEqual(["explore", "implement", "review"]);
  });

  it("passes Explore findings into Implement input", async () => {
    const implementInputs: PhaseInput[] = [];
    const runner: PhaseRunner = async (input) => {
      if (input.role === "explore") {
        return completed("explore", { findings: ["src/auth.ts handles login"] });
      }
      if (input.role === "implement") {
        implementInputs.push(input);
      }
      return completed(input.role);
    };

    await runMultiAgentOrchestration("fix auth", { runPhase: runner });

    expect(implementInputs[0]?.findings).toEqual(["src/auth.ts handles login"]);
  });

  it("passes changed files and test summaries into Review input", async () => {
    const reviewInputs: PhaseInput[] = [];
    const runner: PhaseRunner = async (input) => {
      if (input.role === "implement") {
        return completed("implement", {
          changedFiles: ["src/auth.ts"],
          tests: ["pnpm test -- tests/auth.test.ts"],
        });
      }
      if (input.role === "review") {
        reviewInputs.push(input);
      }
      return completed(input.role);
    };

    await runMultiAgentOrchestration("fix auth", { runPhase: runner });

    expect(reviewInputs[0]?.changedFiles).toEqual(["src/auth.ts"]);
    expect(reviewInputs[0]?.tests).toEqual(["pnpm test -- tests/auth.test.ts"]);
  });

  it("blocks the orchestration when Review returns blocking defects", async () => {
    const runner: PhaseRunner = async (input) => {
      if (input.role === "review") {
        return completed("review", {
          defects: [
            {
              category: "correctness",
              description: "Regression in auth flow",
              priority: "high",
              blocking: true,
            },
          ],
        });
      }
      return completed(input.role);
    };

    const run = await runMultiAgentOrchestration("fix auth", { runPhase: runner });

    expect(run.status).toBe("blocked");
    expect(run.completedAt).toBeInstanceOf(Date);
  });

  it("emits phase lifecycle events", async () => {
    const emit = vi.fn();
    const runner: PhaseRunner = async (input) => completed(input.role);

    await runMultiAgentOrchestration("fix auth", { runId: "run-2", runPhase: runner, emit });

    expect(emit.mock.calls.map(([event]) => event)).toEqual([
      { type: "agent:phase", runId: "run-2", role: "explore", lifecycle: "start" },
      { type: "agent:phase", runId: "run-2", role: "explore", lifecycle: "result" },
      { type: "agent:phase", runId: "run-2", role: "implement", lifecycle: "start" },
      { type: "agent:phase", runId: "run-2", role: "implement", lifecycle: "result" },
      { type: "agent:phase", runId: "run-2", role: "review", lifecycle: "start" },
      { type: "agent:phase", runId: "run-2", role: "review", lifecycle: "result" },
    ]);
  });

  it("serializes phase summaries with persistence-friendly defaults", () => {
    expect(serializePhaseSummary(completed("review"))).toEqual({
      role: "review",
      status: "completed",
      summary: "review complete",
      findings: [],
      changedFiles: [],
      tests: [],
      defects: [],
    });
  });
});
