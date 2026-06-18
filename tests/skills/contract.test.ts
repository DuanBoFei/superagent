import { describe, expect, it } from "vitest";
import {
  createSkillManifest,
  createSkillArgument,
  createSkillDefinition,
  createSkillDiagnostic,
  createSkillRegistry,
  createSkillInvocation,
} from "../../src/skills/types";

describe("Skill domain contracts", () => {
  it("createSkillArgument builds a skill argument descriptor", () => {
    const arg = createSkillArgument({
      name: "feature",
      description: "Feature number",
      required: true,
    });

    expect(arg.name).toBe("feature");
    expect(arg.description).toBe("Feature number");
    expect(arg.required).toBe(true);
  });

  it("createSkillManifest builds a manifest with required fields only", () => {
    const manifest = createSkillManifest({
      name: "run-feature",
      description: "Run a feature workflow",
      version: "1.0.0",
      entry: "SKILL.md",
    });

    expect(manifest.name).toBe("run-feature");
    expect(manifest.description).toBe("Run a feature workflow");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.entry).toBe("SKILL.md");
    expect(manifest.arguments).toEqual([]);
    expect(manifest.suggestedMode).toBeUndefined();
    expect(manifest.allowedRoles).toBeUndefined();
  });

  it("createSkillManifest builds a manifest with all optional fields", () => {
    const arg = createSkillArgument({ name: "target", description: "Target", required: false });
    const manifest = createSkillManifest({
      name: "build",
      description: "Build the project",
      version: "2.0.0",
      entry: "BUILD.md",
      arguments: [arg],
      suggestedMode: "plan",
      allowedRoles: ["implement", "review"],
    });

    expect(manifest.arguments).toHaveLength(1);
    expect(manifest.suggestedMode).toBe("plan");
    expect(manifest.allowedRoles).toEqual(["implement", "review"]);
  });

  it("createSkillDefinition wraps manifest with body text", () => {
    const manifest = createSkillManifest({
      name: "lint",
      description: "Lint the project",
      version: "0.1.0",
      entry: "SKILL.md",
    });
    const def = createSkillDefinition(manifest, "Run biome check .");

    expect(def.manifest).toBe(manifest);
    expect(def.body).toBe("Run biome check .");
  });

  it("createSkillDiagnostic builds a diagnostic record", () => {
    const diag = createSkillDiagnostic({
      skillName: "bad-skill",
      filePath: "/skills/bad/SKILL.md",
      reason: "missing-name",
      message: "Skill manifest missing required field: name",
    });

    expect(diag.skillName).toBe("bad-skill");
    expect(diag.filePath).toBe("/skills/bad/SKILL.md");
    expect(diag.reason).toBe("missing-name");
    expect(diag.message).toBe("Skill manifest missing required field: name");
  });

  it("createSkillRegistry produces empty registry", () => {
    const registry = createSkillRegistry();

    expect(registry.skills.size).toBe(0);
    expect(registry.diagnostics).toEqual([]);
    expect(registry.sourceOrder).toEqual([]);
  });

  it("createSkillRegistry accepts initial data", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "A test skill",
      version: "1.0.0",
      entry: "SKILL.md",
    });
    const def = createSkillDefinition(manifest, "content");
    const diag = createSkillDiagnostic({
      skillName: "broken",
      filePath: "/broken/SKILL.md",
      reason: "parse-error",
      message: "Bad yaml",
    });
    const registry = createSkillRegistry({
      skills: new Map([["test", def]]),
      diagnostics: [diag],
      sourceOrder: ["/project/skills"],
    });

    expect(registry.skills.size).toBe(1);
    expect(registry.skills.get("test")).toBe(def);
    expect(registry.diagnostics).toHaveLength(1);
    expect(registry.sourceOrder).toHaveLength(1);
  });

  it("createSkillInvocation builds an invocation record", () => {
    const invocation = createSkillInvocation("run-feature", { feature: "020" });

    expect(invocation.skillName).toBe("run-feature");
    expect(invocation.args).toEqual({ feature: "020" });
  });

  it("manifest field keys are stable (snapshot)", () => {
    const manifest = createSkillManifest({
      name: "snapshot-test",
      description: "Verify key stability",
      version: "3.2.1",
      entry: "SKILL.md",
      arguments: [
        createSkillArgument({ name: "input", description: "Input file", required: true }),
      ],
      suggestedMode: "plan",
      allowedRoles: ["implement"],
    });

    expect(Object.keys(manifest).sort()).toMatchSnapshot();
  });
});
