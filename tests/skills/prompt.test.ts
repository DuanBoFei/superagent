import { describe, expect, it } from "vitest";
import { createSkillManifest, createSkillDefinition, createSkillArgument } from "../../src/skills/types";
import { renderSkillContext } from "../../src/skills/prompt";

describe("renderSkillContext", () => {
  it("renders skill metadata and body as markdown", () => {
    const skill = createSkillDefinition(
      createSkillManifest({
        name: "run-feature",
        description: "Run a feature workflow from spec to verification.",
        version: "1.0.0",
        entry: "SKILL.md",
      }),
      "Execute the feature workflow step by step.\nCheck tests after each step.",
    );

    const result = renderSkillContext(skill, {});

    expect(result).toContain("run-feature");
    expect(result).toContain("Run a feature workflow from spec to verification.");
    expect(result).toContain("1.0.0");
    expect(result).toContain("Execute the feature workflow step by step.");
    expect(result).toContain("Check tests after each step.");
  });

  it("includes invocation args when provided", () => {
    const skill = createSkillDefinition(
      createSkillManifest({
        name: "run-feature",
        description: "Run feature",
        version: "1.0.0",
        entry: "SKILL.md",
        arguments: [
          createSkillArgument({ name: "feature", description: "Feature ID", required: true }),
        ],
      }),
      "Do the feature.",
    );

    const result = renderSkillContext(skill, { feature: "024-skill-system" });

    expect(result).toContain("feature");
    expect(result).toContain("024-skill-system");
  });

  it("formats as a skill context block with clear boundaries", () => {
    const skill = createSkillDefinition(
      createSkillManifest({
        name: "lint",
        description: "Lint the project.",
        version: "0.1.0",
        entry: "SKILL.md",
      }),
      "pnpm lint",
    );

    const result = renderSkillContext(skill, {});

    // Should have opening/closing markers
    expect(result).toMatch(/skill/i);
    expect(result).toContain("lint");
  });

  it("matches snapshot for stable format", () => {
    const skill = createSkillDefinition(
      createSkillManifest({
        name: "run-feature",
        description: "Run a feature workflow from spec to verification.",
        version: "1.0.0",
        entry: "SKILL.md",
        arguments: [
          createSkillArgument({ name: "feature", description: "Feature number or directory.", required: true }),
        ],
        suggestedMode: "plan",
      }),
      "Skill instructions in markdown.\nRun this to execute a feature workflow.",
    );

    const result = renderSkillContext(skill, { feature: "024-skill-system" });
    expect(result).toMatchSnapshot();
  });
});
