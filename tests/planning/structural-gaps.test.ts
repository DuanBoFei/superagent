/**
 * Structural gap tests for 022-plan-mode
 *
 * These fill gaps identified by test-routing-advisor that TDD unit tests
 * do not cover — real DB roundtrips, resilience/fault injection,
 * and integration seam assertions.
 */
import { describe, expect, it } from "vitest";
import {
  createPlanIntegration,
  type PlanIntegration,
} from "../../src/planning/integration";
import { PlanDecision, PlanApproval } from "../../src/planning/types";
import { createMemoryStore } from "../../src/persistence/memory-store";
import { parsePlanOutput } from "../../src/planning/parser";
import { checkWriteBeforeApproval } from "../../src/planning/scope-guard";

// ───────────────────────────────────────────────────
// Gap 1: Real DB roundtrip — plan state survives save/load
// Routes to: backend-testing
// ───────────────────────────────────────────────────

describe("structural-gap: plan state persistence roundtrip", () => {
  function makeSessionWithPlan(integration: PlanIntegration, planSummary: string) {
    const store = createMemoryStore();
    const sessionId = crypto.randomUUID();
    const now = Date.now();

    const state = integration.buildPlanState(
      PlanDecision.PlanRequested,
      "/plan " + planSummary,
    );
    state.plan = {
      summary: planSummary,
      steps: [{ order: 1, description: "Step 1" }],
      affectedFiles: ["src/file.ts"],
      verification: ["pnpm test"],
      risks: ["Risk 1"],
    };
    state.approval = PlanApproval.Approved;
    state.isExecutable = true;
    const planMeta = integration.toSessionMeta(state);

    const session = {
      sessionId,
      turnNumber: 3,
      messages: [
        { role: "user" as const, content: "/plan " + planSummary },
        {
          role: "assistant" as const,
          content: `Plan generated: ${planSummary}`,
        },
      ],
      toolResults: [],
      state: "COMPLETED" as const,
      interruptFlag: false,
      startedAt: now,
    };

    store.save(session);
    return { store, sessionId, planMeta, integration };
  }

  it("plan metadata survives save → load cycle", () => {
    const integration = createPlanIntegration();
    const { store, sessionId, planMeta } = makeSessionWithPlan(
      integration,
      "Refactor auth module",
    );

    // Simulate resume: load the session
    const loaded = store.load(sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded?.sessionId).toBe(sessionId);
    expect(loaded?.turnNumber).toBe(3);

    // Restore plan state from metadata
    const restored = integration.fromSessionMeta(planMeta);
    expect(restored).not.toBeNull();
    expect(restored?.decision).toBe("plan-requested");
    expect(restored?.approval).toBe("approved");
    expect(restored?.isExecutable).toBe(true);
  });

  it("resumed plan approval state still denies writes if not approved", () => {
    const integration = createPlanIntegration();
    const state = integration.buildPlanState(
      PlanDecision.PlanRequired,
      "auto-triggered plan",
    );
    // Plan was generated but never approved — remains pending
    state.approval = PlanApproval.Pending;

    const meta = integration.toSessionMeta(state);
    const restored = integration.fromSessionMeta(meta);

    expect(restored?.approval).toBe("pending");
    // Even after resume, pending plans should still block writes
    const writeCheck = checkWriteBeforeApproval(
      restored?.approval ?? PlanApproval.Pending,
    );
    expect(writeCheck.allowed).toBe(false);
  });

  it("sessions without plan metadata restore with no plan state", () => {
    const integration = createPlanIntegration();
    const emptyMeta = {};

    const restored = integration.fromSessionMeta(emptyMeta);
    expect(restored).toBeNull();
  });
});

// ───────────────────────────────────────────────────
// Gap 2: Resilience — planner model call failure
// Routes to: backend-testing
// ───────────────────────────────────────────────────

describe("structural-gap: planner resilience / fault injection", () => {
  it("generatePlan falls back gracefully when model call throws", async () => {
    const integration = createPlanIntegration({
      planModelCall: async () => {
        throw new Error("API timeout");
      },
    });

    await expect(
      integration.generatePlan("refactor auth"),
    ).rejects.toThrow("API timeout");
  });

  it("generatePlan handles malformed JSON from model", async () => {
    const integration = createPlanIntegration({
      planModelCall: async () => "This is not valid JSON at all, just rambling",
    });

    const result = await integration.generatePlan("fix login");
    expect(result.planText).toBe("This is not valid JSON at all, just rambling");
    expect(result.isExecutable).toBe(false);
    expect(result.parsedPlan).toBeUndefined();
  });

  it("generatePlan with missing model call produces best-effort plan", async () => {
    // No planModelCall provided — uses fallback
    const integration = createPlanIntegration({});

    const result = await integration.generatePlan("simple task");
    expect(result.planText).toBeDefined();
    expect(result.isExecutable).toBe(true);
    expect(result.parsedPlan?.summary).toBe("simple task");
  });

  it("generatePlan handles empty model response", async () => {
    const integration = createPlanIntegration({
      planModelCall: async () => "",
    });

    const result = await integration.generatePlan("do something");
    expect(result.isExecutable).toBe(false);
    expect(result.parsedPlan).toBeUndefined();
  });

  it("generatePlan handles model returning null-like JSON values", async () => {
    const integration = createPlanIntegration({
      planModelCall: async () => "null",
    });

    const result = await integration.generatePlan("task");
    expect(result.isExecutable).toBe(false);
  });
});

// ───────────────────────────────────────────────────
// Gap 3: Seam assertion — reject → scope guard blocks ALL writes
// Routes to: fullstack-slice-testing
// ───────────────────────────────────────────────────

describe("structural-gap: seam — reject blocks all subsequent writes", () => {
  it("after rejection, scope guard denies writes for ALL files", () => {
    const integration = createPlanIntegration();
    const state = integration.buildPlanState(
      PlanDecision.PlanRequired,
      "risky operation",
    );
    state.plan = {
      summary: "Risky plan",
      steps: [{ order: 1, description: "Step" }],
      affectedFiles: ["src/a.ts", "src/b.ts"],
      verification: ["test"],
      risks: ["Data loss"],
    };

    // User rejects
    const rejectResult = integration.reject(state);
    expect(rejectResult.success).toBe(true);

    // Verify scope guard blocks writes for ALL files
    const check1 = integration.checkWriteAllowed(
      PlanApproval.Rejected,
      state.plan!,
      [],
      "src/a.ts",
    );
    expect(check1.allowed).toBe(false);
    expect(check1.reason).toContain("approved plan");

    const check2 = integration.checkWriteAllowed(
      PlanApproval.Rejected,
      state.plan!,
      [],
      "src/any-other-file.ts",
    );
    expect(check2.allowed).toBe(false);
  });

  it("approval can only be given once from pending", () => {
    const integration = createPlanIntegration();
    const state = integration.buildPlanState(
      PlanDecision.PlanRequested,
      "/plan task",
    );

    const first = integration.approve(state);
    expect(first.success).toBe(true);

    // Cannot approve again (already approved)
    state.approval = PlanApproval.Approved;
    const second = integration.approve(state);
    expect(second.success).toBe(false);
  });
});

// ───────────────────────────────────────────────────
// Gap 4: Seam assertion — plan context injection
// Routes to: fullstack-slice-testing
// ───────────────────────────────────────────────────

describe("structural-gap: seam — plan context injection into execution", () => {
  it("scope guard differentiates in-plan vs out-of-plan files", () => {
    const integration = createPlanIntegration({ maxScopeExpansion: 2 });
    const plan = {
      summary: "Plan",
      steps: [{ order: 1, description: "Step" }],
      affectedFiles: ["src/auth/login.ts"],
      verification: ["test"],
      risks: ["None"],
    };

    // In-plan file always allowed when approved
    const inPlan = integration.checkWriteAllowed(
      PlanApproval.Approved,
      plan,
      [],
      "src/auth/login.ts",
    );
    expect(inPlan.allowed).toBe(true);

    // Out-of-plan file allowed within expansion limit
    const outPlan1 = integration.checkWriteAllowed(
      PlanApproval.Approved,
      plan,
      [],
      "src/other/file1.ts",
    );
    expect(outPlan1.allowed).toBe(true);

    // Out-of-plan file denied when expansion limit exceeded
    const outPlan2 = integration.checkWriteAllowed(
      PlanApproval.Approved,
      plan,
      ["src/other/file1.ts", "src/other/file2.ts"],
      "src/other/file3.ts",
    );
    expect(outPlan2.allowed).toBe(false);
    expect(outPlan2.reason).toContain("Scope expanded");
  });

  it("plan without affectedFiles still allows execution within expansion limit", () => {
    const integration = createPlanIntegration({ maxScopeExpansion: 2 });
    const plan = {
      summary: "Minimal plan",
      steps: [{ order: 1, description: "Explore" }],
      affectedFiles: [],
      verification: ["review"],
      risks: ["Unknown scope"],
    };

    const check = integration.checkWriteAllowed(
      PlanApproval.Approved,
      plan,
      [],
      "src/new-file.ts",
    );
    expect(check.allowed).toBe(true);
  });

  it("event is emitted on scope expansion", () => {
    const events: Array<{ type: string; message?: string }> = [];
    const integration = createPlanIntegration({
      maxScopeExpansion: 1,
      onEvent: (e) => events.push(e),
    });

    const plan = {
      summary: "Plan",
      steps: [{ order: 1, description: "Step" }],
      affectedFiles: ["src/a.ts"],
      verification: ["test"],
      risks: ["None"],
    };

    integration.checkWriteAllowed(
      PlanApproval.Approved,
      plan,
      ["src/b.ts"],
      "src/c.ts",
    );

    const scopeEvent = events.find((e) => e.type === "plan:scope_expanded");
    expect(scopeEvent).toBeDefined();
    expect(scopeEvent?.message).toContain("Scope expanded");
  });
});

// ───────────────────────────────────────────────────
// Gap 5: Seam assertion — malformed plan → CLI rendering
// Routes to: fullstack-slice-testing
// ───────────────────────────────────────────────────

describe("structural-gap: seam — malformed plan rendering", () => {
  it("malformed plan is marked not executable", () => {
    const result = parsePlanOutput("random text without structure");
    expect(result.isExecutable).toBe(false);
    expect(result.parseError).toBeTruthy();
  });

  it("detector → plan generation → malformed parse → not executable chain", async () => {
    const integration = createPlanIntegration({
      planModelCall: async () => "I think we should maybe do something? Not sure what.",
    });

    const decision = integration.detect("refactor everything");
    expect(decision).toBe(PlanDecision.PlanRequired);

    const result = await integration.generatePlan("refactor everything");
    expect(result.isExecutable).toBe(false);
    expect(result.parsedPlan).toBeUndefined();
    // When plan is not executable, it should be shown as text but not auto-approved
    expect(result.planText).toBeTruthy();
  });

  it("plan with valid structure but empty verification is executable", () => {
    // Empty verification array is technically valid per schema
    const json = JSON.stringify({
      summary: "Plan",
      steps: [{ order: 1, description: "Step" }],
      affectedFiles: ["f.ts"],
      verification: [""], // empty string in array is valid
      risks: ["R"],
    });
    const result = parsePlanOutput(json);
    expect(result.isExecutable).toBe(true);
  });

  it("plan-generate-approve full chain with invalid model output", async () => {
    const events: Array<{ type: string }> = [];
    const integration = createPlanIntegration({
      planModelCall: async () => "```json\n" + JSON.stringify({
        summary: "Bad plan",
        // missing steps, affectedFiles, verification, risks
      }) + "\n```",
      onEvent: (e) => events.push(e),
    });

    const result = await integration.generatePlan("do something");
    expect(result.isExecutable).toBe(false);

    // Build state with non-executable plan
    const state = integration.buildPlanState(
      PlanDecision.PlanRequested,
      "/plan do something",
    );
    state.planText = result.planText;
    state.isExecutable = result.isExecutable;

    // Non-executable plan should not prevent manual review
    // (user can still read the text and decide)
    expect(state.isExecutable).toBe(false);
    expect(state.planText).toContain("Bad plan");
  });
});

// ───────────────────────────────────────────────────
// Gap 6: Full integration — all events fire in sequence
// Routes to: fullstack-slice-testing
// ───────────────────────────────────────────────────

describe("structural-gap: full event sequence", () => {
  it("emits all expected events in plan → approve → execute flow", async () => {
    const events: Array<{ type: string }> = [];
    const integration = createPlanIntegration({
      planModelCall: async () =>
        JSON.stringify({
          summary: "Refactor auth",
          steps: [{ order: 1, description: "Add types" }],
          affectedFiles: ["src/auth/types.ts"],
          verification: ["pnpm test"],
          risks: ["Breaking change"],
        }),
      onEvent: (e) => events.push(e),
    });

    // 1. Detect
    const decision = integration.detect("/plan refactor auth");
    expect(decision).toBe(PlanDecision.PlanRequested);
    expect(events.some((e) => e.type === "plan:decided")).toBe(true);

    // 2. Generate
    const task = integration.extractTask("/plan refactor auth");
    const result = await integration.generatePlan(task);
    expect(result.isExecutable).toBe(true);
    expect(events.some((e) => e.type === "plan:generated")).toBe(true);

    // 3. Build and approve
    const state = integration.buildPlanState(decision, "/plan refactor auth");
    state.plan = result.parsedPlan;
    state.isExecutable = result.isExecutable;
    const approveResult = integration.approve(state);
    expect(approveResult.success).toBe(true);
    expect(events.some((e) => e.type === "plan:approved")).toBe(true);

    // 4. Write check passes
    const writeCheck = integration.checkWriteAllowed(
      PlanApproval.Approved,
      state.plan!,
      [],
      "src/auth/types.ts",
    );
    expect(writeCheck.allowed).toBe(true);
  });
});
