import { describe, expect, it } from "vitest";
import {
  executionPlanSchema,
  planStepSchema,
  PlanDecision,
  PlanApproval,
} from "../../src/planning/types";

describe("executionPlanSchema", () => {
  it("accepts a valid minimal plan", () => {
    const result = executionPlanSchema.safeParse({
      summary: "Refactor auth module",
      steps: [{ order: 1, description: "Add types" }],
      affectedFiles: ["src/auth/types.ts"],
      verification: ["pnpm test"],
      risks: ["Breaking change to API surface"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid full plan with optional fields", () => {
    const result = executionPlanSchema.safeParse({
      summary: "Add user registration endpoint",
      steps: [
        {
          order: 1,
          description: "Create User schema",
          file: "src/models/user.ts",
          verification: "pnpm test -- tests/models",
        },
        {
          order: 2,
          description: "Add register handler",
          file: "src/api/register.ts",
          verification: "curl -X POST /register",
        },
      ],
      affectedFiles: ["src/models/user.ts", "src/api/register.ts"],
      verification: ["pnpm test", "pnpm typecheck"],
      risks: ["Password hashing strength", "Email uniqueness constraint"],
      assumptions: ["Users table already exists"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty summary", () => {
    const result = executionPlanSchema.safeParse({
      summary: "",
      steps: [{ order: 1, description: "Do something" }],
      affectedFiles: ["file.ts"],
      verification: ["test"],
      risks: ["risk"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty steps array", () => {
    const result = executionPlanSchema.safeParse({
      summary: "A plan",
      steps: [],
      affectedFiles: ["file.ts"],
      verification: ["test"],
      risks: ["risk"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects step with order < 1", () => {
    const result = executionPlanSchema.safeParse({
      summary: "A plan",
      steps: [{ order: 0, description: "Bad step" }],
      affectedFiles: ["file.ts"],
      verification: ["test"],
      risks: ["risk"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects step with empty description", () => {
    const result = executionPlanSchema.safeParse({
      summary: "A plan",
      steps: [{ order: 1, description: "" }],
      affectedFiles: ["file.ts"],
      verification: ["test"],
      risks: ["risk"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing affectedFiles", () => {
    const result = executionPlanSchema.safeParse({
      summary: "A plan",
      steps: [{ order: 1, description: "Step" }],
      verification: ["test"],
      risks: ["risk"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing verification", () => {
    const result = executionPlanSchema.safeParse({
      summary: "A plan",
      steps: [{ order: 1, description: "Step" }],
      affectedFiles: ["file.ts"],
      risks: ["risk"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing risks", () => {
    const result = executionPlanSchema.safeParse({
      summary: "A plan",
      steps: [{ order: 1, description: "Step" }],
      affectedFiles: ["file.ts"],
      verification: ["test"],
    });
    expect(result.success).toBe(false);
  });

  it("snapshot: ExecutionPlan shape matches expected keys", () => {
    const shape = (executionPlanSchema._def as { shape: Record<string, unknown> })
      .shape;
    const keys = Object.keys(shape);
    expect(keys.sort()).toEqual([
      "affectedFiles",
      "assumptions",
      "risks",
      "steps",
      "summary",
      "verification",
    ]);
  });

  it("snapshot: PlanStep shape matches expected keys", () => {
    const shape = (planStepSchema._def as { shape: Record<string, unknown> })
      .shape;
    const keys = Object.keys(shape);
    expect(keys.sort()).toEqual([
      "description",
      "file",
      "order",
      "verification",
    ]);
  });
});

describe("PlanDecision", () => {
  it("has exactly three decision values", () => {
    expect(Object.values(PlanDecision).sort()).toEqual([
      "direct",
      "plan-requested",
      "plan-required",
    ]);
  });
});

describe("PlanApproval", () => {
  it("has exactly three approval states", () => {
    expect(Object.values(PlanApproval).sort()).toEqual([
      "approved",
      "pending",
      "rejected",
    ]);
  });
});
