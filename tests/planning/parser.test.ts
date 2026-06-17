import { describe, expect, it } from "vitest";
import { parsePlanOutput } from "../../src/planning/parser";

describe("parsePlanOutput", () => {
  // ── Valid JSON ──

  it("parses valid JSON plan", () => {
    const json = JSON.stringify({
      summary: "Refactor auth",
      steps: [{ order: 1, description: "Add types" }],
      affectedFiles: ["src/auth/types.ts"],
      verification: ["pnpm test"],
      risks: ["Breaking change"],
    });
    const result = parsePlanOutput(json);
    expect(result.isExecutable).toBe(true);
    expect(result.plan?.summary).toBe("Refactor auth");
    expect(result.plan?.steps).toHaveLength(1);
  });

  it("parses JSON in code block", () => {
    const json = JSON.stringify({
      summary: "Fix bug",
      steps: [{ order: 1, description: "Patch handler" }],
      affectedFiles: ["src/handler.ts"],
      verification: ["pnpm test"],
      risks: ["Regression"],
    });
    const result = parsePlanOutput("```json\n" + json + "\n```");
    expect(result.isExecutable).toBe(true);
    expect(result.plan?.summary).toBe("Fix bug");
  });

  it("parses JSON in code block without json tag", () => {
    const json = JSON.stringify({
      summary: "Fix bug",
      steps: [{ order: 1, description: "Patch handler" }],
      affectedFiles: ["src/handler.ts"],
      verification: ["pnpm test"],
      risks: ["Regression"],
    });
    const result = parsePlanOutput("```\n" + json + "\n```");
    expect(result.isExecutable).toBe(true);
  });

  it("parses full plan with optional fields", () => {
    const json = JSON.stringify({
      summary: "Full plan",
      steps: [
        { order: 1, description: "Step 1", file: "a.ts", verification: "test a" },
        { order: 2, description: "Step 2", file: "b.ts" },
      ],
      affectedFiles: ["a.ts", "b.ts"],
      verification: ["pnpm test", "pnpm lint"],
      risks: ["R1", "R2"],
      assumptions: ["db exists"],
    });
    const result = parsePlanOutput(json);
    expect(result.isExecutable).toBe(true);
    expect(result.plan?.assumptions).toEqual(["db exists"]);
    expect(result.plan?.verification).toHaveLength(2);
  });

  // ── Malformed / invalid JSON ──

  it("marks plan with missing fields as not executable", () => {
    const result = parsePlanOutput(JSON.stringify({ summary: "Only summary" }));
    expect(result.isExecutable).toBe(false);
    expect(result.parseError).toBeTruthy();
  });

  it("marks empty string as not executable", () => {
    const result = parsePlanOutput("");
    expect(result.isExecutable).toBe(false);
  });

  it("marks invalid JSON as not executable", () => {
    const result = parsePlanOutput("not json at all");
    expect(result.isExecutable).toBe(false);
    expect(result.parseError).toBeTruthy();
  });

  it("marks plan with empty steps as not executable", () => {
    const json = JSON.stringify({
      summary: "Plan",
      steps: [],
      affectedFiles: ["f.ts"],
      verification: ["test"],
      risks: ["risk"],
    });
    const result = parsePlanOutput(json);
    expect(result.isExecutable).toBe(false);
  });

  it("marks plan with empty summary as not executable", () => {
    const json = JSON.stringify({
      summary: "",
      steps: [{ order: 1, description: "Step" }],
      affectedFiles: ["f.ts"],
      verification: ["test"],
      risks: ["risk"],
    });
    const result = parsePlanOutput(json);
    expect(result.isExecutable).toBe(false);
  });

  // ── Markdown fallback ──

  it("extracts plan from markdown with summary", () => {
    const md = [
      "## Plan",
      "",
      "Summary: Refactor the auth module",
      "",
      "Step 1: Extract types",
      "Step 2: Update handlers",
      "",
      "File: src/auth/types.ts",
      "File: src/auth/handler.ts",
      "",
      "Risk: Breaking changes to public API",
    ].join("\n");

    const result = parsePlanOutput(md);
    expect(result.plan?.summary).toBe("Refactor the auth module");
    expect(result.plan?.steps).toHaveLength(2);
    expect(result.plan?.affectedFiles).toHaveLength(2);
    expect(result.plan?.risks).toHaveLength(1);
  });

  it("markdown plan with missing required fields is not executable", () => {
    const result = parsePlanOutput("Summary: Do something");
    expect(result.isExecutable).toBe(false);
  });

  // ── Garbage input ──

  it("returns rawText even when unparseable", () => {
    const result = parsePlanOutput("blah blah");
    expect(result.rawText).toBe("blah blah");
    expect(result.isExecutable).toBe(false);
  });
});
