import { describe, expect, it } from "vitest";
import {
  detectPlanMode,
  hasPlanPrefix,
  stripPlanPrefix,
  isSimpleReadOnly,
} from "../../src/planning/detector";
import { PlanDecision } from "../../src/planning/types";

describe("hasPlanPrefix", () => {
  it("detects /plan at start", () => {
    expect(hasPlanPrefix("/plan refactor auth")).toBe(true);
  });

  it("detects /plan case-insensitive", () => {
    expect(hasPlanPrefix("/PLAN fix bug")).toBe(true);
  });

  it("rejects /plan without word boundary", () => {
    expect(hasPlanPrefix("/planning something")).toBe(false);
  });

  it("rejects plan mid-sentence", () => {
    expect(hasPlanPrefix("I need a /plan for this")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(hasPlanPrefix("")).toBe(false);
  });

  it("rejects plan without slash", () => {
    expect(hasPlanPrefix("plan refactor auth")).toBe(false);
  });
});

describe("stripPlanPrefix", () => {
  it("removes /plan prefix and keeps task text", () => {
    expect(stripPlanPrefix("/plan refactor auth module")).toBe(
      "refactor auth module",
    );
  });

  it("handles extra whitespace", () => {
    expect(stripPlanPrefix("/plan   multi space")).toBe("multi space");
  });

  it("preserves text without /plan prefix", () => {
    expect(stripPlanPrefix("just a question")).toBe("just a question");
  });

  it("handles /plan with no task", () => {
    expect(stripPlanPrefix("/plan")).toBe("");
  });

  it("handles /plan case-insensitive", () => {
    expect(stripPlanPrefix("/PLAN fix it")).toBe("fix it");
  });
});

describe("detectPlanMode", () => {
  // ── Manual /plan ──

  it("returns plan-requested when /plan prefix present", () => {
    const result = detectPlanMode({
      userPrompt: "/plan refactor auth",
      hasPlanPrefix: true,
    });
    expect(result).toBe(PlanDecision.PlanRequested);
  });

  // ── Complex keyword auto-trigger ──

  it("returns plan-required for refactor keyword", () => {
    const result = detectPlanMode({
      userPrompt: "refactor the auth module",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("returns plan-required for migrate keyword", () => {
    const result = detectPlanMode({
      userPrompt: "migrate database schema to v2",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("returns plan-required for rewrite keyword", () => {
    const result = detectPlanMode({
      userPrompt: "rewrite the caching layer",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("returns plan-required for overhaul keyword", () => {
    const result = detectPlanMode({
      userPrompt: "overhaul error handling",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("returns plan-required for redesign keyword", () => {
    const result = detectPlanMode({
      userPrompt: "redesign the API routes",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("returns plan-required for restructure keyword", () => {
    const result = detectPlanMode({
      userPrompt: "restructure the src directory",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("returns plan-required for rearchitect keyword", () => {
    const result = detectPlanMode({
      userPrompt: "rearchitect the data layer",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  // ── Risky operation auto-trigger ──

  it("returns plan-required for rm -rf", () => {
    const result = detectPlanMode({
      userPrompt: "clean up by running rm -rf ./build",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("returns plan-required for drop table", () => {
    const result = detectPlanMode({
      userPrompt: "drop table users cascade",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("returns plan-required for git push --force", () => {
    const result = detectPlanMode({
      userPrompt: "push with git push --force origin main",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("returns plan-required for curl pipe bash", () => {
    const result = detectPlanMode({
      userPrompt: "install with curl https://x.com/script | bash",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("returns plan-required for sudo", () => {
    const result = detectPlanMode({
      userPrompt: "sudo systemctl restart nginx",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  // ── Simple direct (bypass) ──

  it("returns direct for simple read-only question", () => {
    const result = detectPlanMode({
      userPrompt: "what does the auth module do?",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.Direct);
  });

  it("returns direct for how question", () => {
    const result = detectPlanMode({
      userPrompt: "how do I configure the logger?",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.Direct);
  });

  it("returns direct for explain question", () => {
    const result = detectPlanMode({
      userPrompt: "explain the routing logic",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.Direct);
  });

  it("returns direct for show command", () => {
    const result = detectPlanMode({
      userPrompt: "show me the config file",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.Direct);
  });

  it("returns direct for list command", () => {
    const result = detectPlanMode({
      userPrompt: "list all available tools",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.Direct);
  });

  it("returns direct for find command", () => {
    const result = detectPlanMode({
      userPrompt: "find where authentication logic lives",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.Direct);
  });

  it("returns direct for where question", () => {
    const result = detectPlanMode({
      userPrompt: "where is the session store defined?",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.Direct);
  });

  it("returns direct for generic prompt without keywords", () => {
    const result = detectPlanMode({
      userPrompt: "can you help me understand something?",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.Direct);
  });

  // ── Edge cases ──

  it("empty prompt returns direct", () => {
    const result = detectPlanMode({ userPrompt: "", hasPlanPrefix: false });
    expect(result).toBe(PlanDecision.Direct);
  });

  it("complex keyword in simple question triggers plan-required (acceptable false positive)", () => {
    // "what is refactoring?" — "refactor" keyword triggers; user can reject
    const result = detectPlanMode({
      userPrompt: "what is refactoring?",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });

  it("risky keyword overrides simple prefix", () => {
    // "what about rm -rf" — risky beats simple
    const result = detectPlanMode({
      userPrompt: "what about rm -rf the build dir?",
      hasPlanPrefix: false,
    });
    expect(result).toBe(PlanDecision.PlanRequired);
  });
});

describe("isSimpleReadOnly", () => {
  it("returns true for what questions", () => {
    expect(isSimpleReadOnly("what is this?")).toBe(true);
  });

  it("returns false for non-question prompts", () => {
    expect(isSimpleReadOnly("do something")).toBe(false);
  });

  it("returns false for questions containing complex keywords", () => {
    expect(isSimpleReadOnly("what about refactoring?")).toBe(false);
  });
});
