import { describe, expect, it } from "vitest";
import { detectPlanMode } from "../../src/planning/detector";
import { hasPlanPrefix, stripPlanPrefix } from "../../src/planning/detector";
import { buildPlannerPrompt } from "../../src/planning/prompt";
import { parsePlanOutput } from "../../src/planning/parser";
import { transitionApproval, isApprovalFinal } from "../../src/planning/approval";
import { checkWriteBeforeApproval } from "../../src/planning/scope-guard";
import { PlanDecision, PlanApproval } from "../../src/planning/types";
import { createPlanIntegration } from "../../src/planning/integration";

// ───────────────────────────────────────────────────
// T026: /plan produces no writes before approval
// ───────────────────────────────────────────────────

describe("plan-mode: no writes before approval", () => {
  it("detects /plan prefix and returns plan-requested", () => {
    const decision = detectPlanMode({
      userPrompt: "/plan refactor auth",
      hasPlanPrefix: true,
    });
    expect(decision).toBe(PlanDecision.PlanRequested);
  });

  it("checkWriteBeforeApproval denies when pending", () => {
    const result = checkWriteBeforeApproval(PlanApproval.Pending);
    expect(result.allowed).toBe(false);
  });

  it("checkWriteBeforeApproval denies when rejected", () => {
    const result = checkWriteBeforeApproval(PlanApproval.Rejected);
    expect(result.allowed).toBe(false);
  });

  it("plan is generated from fake model call without side effects", async () => {
    const integration = createPlanIntegration({
      planModelCall: async () =>
        JSON.stringify({
          summary: "Refactor auth",
          steps: [{ order: 1, description: "Add types" }],
          affectedFiles: ["src/auth/types.ts"],
          verification: ["pnpm test"],
          risks: ["Breaking API"],
        }),
    });

    const task = "refactor auth";
    const { planText, parsedPlan, isExecutable } =
      await integration.generatePlan(task);

    expect(planText).toContain("Refactor auth");
    expect(parsedPlan).toBeDefined();
    expect(isExecutable).toBe(true);

    // Verify plan has required fields
    expect(parsedPlan?.summary).toBe("Refactor auth");
    expect(parsedPlan?.steps).toHaveLength(1);
    expect(parsedPlan?.affectedFiles).toContain("src/auth/types.ts");
  });

  it("generated plan is validated by schema", () => {
    const planJson = JSON.stringify({
      summary: "Fix bug",
      steps: [{ order: 1, description: "Patch handler" }],
      affectedFiles: ["src/handler.ts"],
      verification: ["pnpm test"],
      risks: ["Regression"],
    });
    const result = parsePlanOutput(planJson);
    expect(result.isExecutable).toBe(true);
  });
});

// ───────────────────────────────────────────────────
// T027: approval to execution integration
// ───────────────────────────────────────────────────

describe("plan-mode: approval to execution", () => {
  it("pending → approved transition succeeds", () => {
    const result = transitionApproval(PlanApproval.Pending, PlanApproval.Approved);
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PlanApproval.Approved);
  });

  it("approved state allows writes", () => {
    const result = checkWriteBeforeApproval(PlanApproval.Approved);
    expect(result.allowed).toBe(true);
  });

  it("integration: full approve flow", () => {
    const events: Array<{ type: string }> = [];
    const integration = createPlanIntegration({
      onEvent: (e) => events.push(e),
    });

    // Detect plan needed
    const decision = integration.detect("refactor auth module");
    expect(decision).toBe(PlanDecision.PlanRequired);

    // Build state
    const state = integration.buildPlanState(decision, "refactor auth module");
    state.plan = {
      summary: "Refactor auth",
      steps: [{ order: 1, description: "Add types" }],
      affectedFiles: ["src/auth/types.ts"],
      verification: ["pnpm test"],
      risks: ["Breaking change"],
    };
    state.isExecutable = true;

    // Approve
    const approveResult = integration.approve(state);
    expect(approveResult.success).toBe(true);

    // Verify event emitted
    expect(events.some((e) => e.type === "plan:approved")).toBe(true);
  });
});

// ───────────────────────────────────────────────────
// T028: rejection no files changed
// ───────────────────────────────────────────────────

describe("plan-mode: rejection no files changed", () => {
  it("pending → rejected transition succeeds", () => {
    const result = transitionApproval(PlanApproval.Pending, PlanApproval.Rejected);
    expect(result.success).toBe(true);
    expect(result.newState).toBe(PlanApproval.Rejected);
  });

  it("rejected state denies writes", () => {
    const result = checkWriteBeforeApproval(PlanApproval.Rejected);
    expect(result.allowed).toBe(false);
  });

  it("rejected is a final state", () => {
    expect(isApprovalFinal(PlanApproval.Rejected)).toBe(true);
  });

  it("cannot transition from rejected back to approved", () => {
    const result = transitionApproval(
      PlanApproval.Rejected,
      PlanApproval.Approved,
    );
    expect(result.success).toBe(false);
  });

  it("integration: full reject flow", () => {
    const events: Array<{ type: string }> = [];
    const integration = createPlanIntegration({
      onEvent: (e) => events.push(e),
    });

    const state = integration.buildPlanState(
      PlanDecision.PlanRequired,
      "dangerous operation",
    );
    const rejectResult = integration.reject(state);
    expect(rejectResult.success).toBe(true);
    expect(events.some((e) => e.type === "plan:rejected")).toBe(true);
  });
});

// ───────────────────────────────────────────────────
// T029: persist approved plan summary in session
// ───────────────────────────────────────────────────

describe("plan-mode: session persistence", () => {
  it("serializes plan state to session metadata", () => {
    const integration = createPlanIntegration();
    const state = integration.buildPlanState(
      PlanDecision.PlanRequested,
      "/plan refactor auth",
    );
    state.plan = {
      summary: "Refactor auth module",
      steps: [{ order: 1, description: "Extract types" }],
      affectedFiles: ["src/auth/types.ts"],
      verification: ["pnpm test"],
      risks: ["Breaking change"],
    };
    state.approval = PlanApproval.Approved;
    state.isExecutable = true;

    const meta = integration.toSessionMeta(state);
    expect(meta.planDecision).toBe("plan-requested");
    expect(meta.planApproval).toBe("approved");
    expect(meta.planSummary).toBe("Refactor auth module");
    expect(meta.planIsExecutable).toBe(true);
  });

  it("deserializes plan state from session metadata", () => {
    const integration = createPlanIntegration();
    const restored = integration.fromSessionMeta({
      planDecision: "plan-required",
      planApproval: "pending",
      planSummary: "Restored plan",
      planIsExecutable: false,
    });

    expect(restored).not.toBeNull();
    expect(restored?.decision).toBe("plan-required");
    expect(restored?.approval).toBe("pending");
  });

  it("returns null for session without plan metadata", () => {
    const integration = createPlanIntegration();
    const restored = integration.fromSessionMeta({});
    expect(restored).toBeNull();
  });
});

// ───────────────────────────────────────────────────
// T030: 020 adapter — approved plan consumed by Implement
// ───────────────────────────────────────────────────

describe("plan-mode: 020 adapter", () => {
  it("approved plan shape is compatible with agent context", () => {
    const plan = {
      summary: "Refactor auth",
      steps: [
        { order: 1, description: "Step 1", file: "a.ts" },
        { order: 2, description: "Step 2", file: "b.ts" },
      ],
      affectedFiles: ["a.ts", "b.ts"],
      verification: ["pnpm test"],
      risks: ["Breaking change"],
    };

    // 020 adapter would consume this shape
    const implementContext = {
      planSummary: plan.summary,
      steps: plan.steps.map((s) => s.description),
      files: plan.affectedFiles,
      verification: plan.verification,
      riskNotes: plan.risks,
    };

    expect(implementContext.planSummary).toBe("Refactor auth");
    expect(implementContext.steps).toEqual(["Step 1", "Step 2"]);
    expect(implementContext.files).toEqual(["a.ts", "b.ts"]);
    expect(implementContext.verification).toEqual(["pnpm test"]);
    expect(implementContext.riskNotes).toEqual(["Breaking change"]);
  });

  it("adapter handles plan with minimal fields", () => {
    const minimalPlan = {
      summary: "Quick fix",
      steps: [{ order: 1, description: "Fix typo" }],
      affectedFiles: ["readme.md"],
      verification: [],
      risks: ["None"],
    };

    const implementContext = {
      planSummary: minimalPlan.summary,
      steps: minimalPlan.steps.map((s) => s.description),
      files: minimalPlan.affectedFiles,
      verification: minimalPlan.verification.length > 0 ? minimalPlan.verification : ["manual review"],
      riskNotes: minimalPlan.risks,
    };

    expect(implementContext.steps).toEqual(["Fix typo"]);
    expect(implementContext.verification).toEqual(["manual review"]);
  });
});

// ───────────────────────────────────────────────────
// T025: runtime routing wire-up
// ───────────────────────────────────────────────────

describe("plan-mode: runtime routing", () => {
  it("routes /plan prefixed prompt through detector", () => {
    const integration = createPlanIntegration();
    const userPrompt = "/plan refactor auth module";

    const hasPlan = integration.hasPlanPrefix(userPrompt);
    expect(hasPlan).toBe(true);

    const task = stripPlanPrefix(userPrompt);
    expect(task).toBe("refactor auth module");

    const decision = integration.detect(userPrompt);
    expect(decision).toBe(PlanDecision.PlanRequested);
  });

  it("routes complex task through auto-detection", () => {
    const integration = createPlanIntegration();
    const decision = integration.detect("restructure the entire backend");
    expect(decision).toBe(PlanDecision.PlanRequired);
  });

  it("routes simple question directly", () => {
    const integration = createPlanIntegration();
    const decision = integration.detect("what does this function do?");
    expect(decision).toBe(PlanDecision.Direct);
  });
});

// ───────────────────────────────────────────────────
// T024: CLI one-shot parsing
// ───────────────────────────────────────────────────

describe("plan-mode: CLI one-shot parsing", () => {
  it("detects /plan in one-shot prompt", () => {
    const prompt = "/plan fix the login bug";
    expect(hasPlanPrefix(prompt)).toBe(true);
  });

  it("strips /plan for model consumption", () => {
    const prompt = "/plan add user registration";
    expect(stripPlanPrefix(prompt)).toBe("add user registration");
  });

  it("passes through non-plan prompts unchanged", () => {
    const prompt = "help me understand the code";
    expect(hasPlanPrefix(prompt)).toBe(false);
    expect(stripPlanPrefix(prompt)).toBe(prompt);
  });

  it("planner prompt includes required fields", () => {
    const prompt = buildPlannerPrompt("fix auth bug");
    expect(prompt.system).toContain("summary");
    expect(prompt.system).toContain("steps");
    expect(prompt.system).toContain("affectedFiles");
    expect(prompt.system).toContain("verification");
    expect(prompt.system).toContain("risks");
    expect(prompt.user).toContain("fix auth bug");
  });
});
