import { describe, expect, it } from "vitest";
import {
  createSkillRegistry,
  createSkillManifest,
  createSkillDefinition,
} from "../../src/skills/types";
import { getSkill, listSkills } from "../../src/skills/registry";

describe("listSkills", () => {
  it("returns sorted skill names from registry", () => {
    const registry = createSkillRegistry({
      skills: new Map([
        [
          "zebra",
          createSkillDefinition(
            createSkillManifest({ name: "zebra", description: "d", version: "1.0.0", entry: "SKILL.md" }),
            "body",
          ),
        ],
        [
          "alpha",
          createSkillDefinition(
            createSkillManifest({ name: "alpha", description: "d", version: "1.0.0", entry: "SKILL.md" }),
            "body",
          ),
        ],
      ]),
    });

    const names = listSkills(registry);
    expect(names).toEqual(["alpha", "zebra"]);
  });

  it("returns empty array for empty registry", () => {
    const registry = createSkillRegistry();
    expect(listSkills(registry)).toEqual([]);
  });
});

describe("getSkill", () => {
  const skill = createSkillDefinition(
    createSkillManifest({ name: "lint", description: "Lint project", version: "1.0.0", entry: "SKILL.md" }),
    "pnpm lint",
  );
  const registry = createSkillRegistry({
    skills: new Map([["lint", skill]]),
  });

  it("returns skill for exact name match", () => {
    const result = getSkill(registry, "lint");
    expect(result.skill).toBe(skill);
  });

  it("returns not-found error with available names for missing skill", () => {
    const registry2 = createSkillRegistry({
      skills: new Map([
        ["alpha", skill],
        ["zebra", skill],
      ]),
    });
    const result = getSkill(registry2, "nonexistent");
    expect(result.error).toBeDefined();
    expect(result.error!.reason).toBe("not-found");
    expect(result.error!.message).toContain("alpha");
    expect(result.error!.message).toContain("zebra");
  });

  it("case-sensitive match only", () => {
    const result = getSkill(registry, "LINT");
    expect(result.error).toBeDefined();
    expect(result.error!.reason).toBe("not-found");
  });
});
