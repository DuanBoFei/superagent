import { describe, expect, it } from "vitest";
import {
  getRolePrompt,
  routeMultiAgentPrompt,
  runMultiAgentOrchestration,
  serializePhaseSummary,
} from "../../src/agents";

describe("agents public exports", () => {
  it("exports the multi-agent public API", async () => {
    expect(getRolePrompt("explore")).toContain("Explore role");
    expect(routeMultiAgentPrompt("/multi-agent fix bug").mode).toBe("multi");

    const run = await runMultiAgentOrchestration("fix bug", {
      runPhase: async (input) => ({ role: input.role, status: "completed", summary: input.role }),
    });

    expect(serializePhaseSummary(run.phases[0]!)).toMatchObject({ role: "explore", status: "completed" });
  });
});
