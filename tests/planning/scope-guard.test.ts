import { describe, expect, it } from "vitest";
import {
  checkWriteBeforeApproval,
  checkFileCountExpansion,
  isFileInScope,
  getExpandedFiles,
} from "../../src/planning/scope-guard";
import type { ExecutionPlan } from "../../src/planning/types";

function makePlan(overrides?: Partial<ExecutionPlan>): ExecutionPlan {
  return {
    summary: "Test plan",
    steps: [{ order: 1, description: "Step" }],
    affectedFiles: ["src/auth/login.ts", "src/auth/types.ts"],
    verification: ["pnpm test"],
    risks: ["Breaking API"],
    ...overrides,
  };
}

describe("checkWriteBeforeApproval", () => {
  it("denies writes when pending", () => {
    const result = checkWriteBeforeApproval("pending");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("approved plan");
  });

  it("denies writes when rejected", () => {
    const result = checkWriteBeforeApproval("rejected");
    expect(result.allowed).toBe(false);
  });

  it("allows writes when approved", () => {
    const result = checkWriteBeforeApproval("approved");
    expect(result.allowed).toBe(true);
  });
});

describe("checkFileCountExpansion", () => {
  it("allows editing a file in the plan", () => {
    const plan = makePlan();
    const result = checkFileCountExpansion(
      plan,
      [],
      "src/auth/login.ts",
      2,
    );
    expect(result.allowed).toBe(true);
  });

  it("allows editing a new file within expansion limit", () => {
    const plan = makePlan();
    const result = checkFileCountExpansion(
      plan,
      [],
      "src/other/file.ts",
      2,
    );
    expect(result.allowed).toBe(true);
  });

  it("denies when unplanned files exceed limit", () => {
    const plan = makePlan();
    // Already touched 3 unplanned files, adding a 4th at limit=3
    const result = checkFileCountExpansion(
      plan,
      ["src/a.ts", "src/b.ts", "src/c.ts"],
      "src/d.ts",
      3,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Scope expanded");
  });

  it("allows expansion exactly at limit", () => {
    const plan = makePlan();
    const result = checkFileCountExpansion(
      plan,
      ["src/a.ts", "src/b.ts"],
      "src/c.ts",
      3,
    );
    expect(result.allowed).toBe(true);
  });

  it("normalizes windows paths", () => {
    const plan = makePlan({
      affectedFiles: ["src/auth/login.ts"],
    });
    const result = checkFileCountExpansion(
      plan,
      [],
      "src\\auth\\login.ts",
      2,
    );
    expect(result.allowed).toBe(true);
  });

  it("defaults maxAllowed to 3 as per spec", () => {
    const plan = makePlan();
    // 4 unplanned files at default limit of 3 should deny
    const result = checkFileCountExpansion(
      plan,
      ["src/a.ts", "src/b.ts", "src/c.ts"],
      "src/d.ts",
      3,
    );
    expect(result.allowed).toBe(false);
  });
});

describe("isFileInScope", () => {
  it("returns true for file in plan", () => {
    const plan = makePlan();
    expect(isFileInScope(plan, "src/auth/login.ts")).toBe(true);
  });

  it("returns false for file not in plan", () => {
    const plan = makePlan();
    expect(isFileInScope(plan, "src/other/module.ts")).toBe(false);
  });

  it("normalizes path separators", () => {
    const plan = makePlan({ affectedFiles: ["src/auth/login.ts"] });
    expect(isFileInScope(plan, "src\\auth\\login.ts")).toBe(true);
  });
});

describe("getExpandedFiles", () => {
  it("returns files not in original plan", () => {
    const plan = makePlan();
    const expanded = getExpandedFiles(plan, [
      "src/auth/login.ts",
      "src/other/module.ts",
    ]);
    expect(expanded).toEqual(["src/other/module.ts"]);
  });

  it("returns empty when all files are in plan", () => {
    const plan = makePlan();
    const expanded = getExpandedFiles(plan, [
      "src/auth/login.ts",
      "src/auth/types.ts",
    ]);
    expect(expanded).toEqual([]);
  });

  it("normalizes paths when comparing", () => {
    const plan = makePlan();
    const expanded = getExpandedFiles(plan, ["src\\auth\\login.ts"]);
    expect(expanded).toEqual([]);
  });
});
