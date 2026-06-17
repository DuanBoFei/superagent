import { describe, expect, it } from "vitest";
import { buildPlannerPrompt } from "../../src/planning/prompt";

describe("buildPlannerPrompt", () => {
  it("returns system and user keys", () => {
    const result = buildPlannerPrompt("refactor auth");
    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("user");
  });

  it("includes task in user prompt", () => {
    const result = buildPlannerPrompt("fix login bug");
    expect(result.user).toContain("fix login bug");
  });

  it("instructs JSON output format", () => {
    const result = buildPlannerPrompt("do something");
    expect(result.system).toContain("summary");
    expect(result.system).toContain("steps");
    expect(result.system).toContain("affectedFiles");
    expect(result.system).toContain("verification");
    expect(result.system).toContain("risks");
  });

  it("warns against destructive commands", () => {
    const result = buildPlannerPrompt("clean up");
    expect(result.system).toContain("destructive");
  });

  it("system prompt is non-empty", () => {
    const result = buildPlannerPrompt("any task");
    expect(result.system.length).toBeGreaterThan(100);
  });

  it("snapshot: system prompt is stable", () => {
    const result1 = buildPlannerPrompt("task A");
    const result2 = buildPlannerPrompt("task B");
    // Same system prompt regardless of task
    expect(result1.system).toBe(result2.system);
  });
});
