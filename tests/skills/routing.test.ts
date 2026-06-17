import { describe, expect, it } from "vitest";
import { createSkillManifest, createSkillDefinition, createSkillRegistry } from "../../src/skills/types";
import { filterByAllowedRoles, hasPlanModeSuggestion, getPlanModeSkills } from "../../src/skills/routing";

describe("filterByAllowedRoles", () => {
  it("returns all skills when no roles are specified on any skill", () => {
    const skills = new Map();
    skills.set("skill1", createSkillDefinition(createSkillManifest({ name: "skill1", version: "1.0.0", description: "A" }), "body"));
    skills.set("skill2", createSkillDefinition(createSkillManifest({ name: "skill2", version: "1.0.0", description: "B" }), "body"));
    const registry = createSkillRegistry({ skills });

    const filtered = filterByAllowedRoles(registry, "planner");

    expect(filtered).toHaveLength(2);
  });

  it("filters out skills that exclude the role", () => {
    const skills = new Map();
    skills.set("open", createSkillDefinition(createSkillManifest({ name: "open", version: "1.0.0", description: "A" }), "body"));
    skills.set("restricted", createSkillDefinition(
      createSkillManifest({ name: "restricted", version: "1.0.0", description: "B", allowedRoles: ["admin"] }),
      "body",
    ));
    const registry = createSkillRegistry({ skills });

    const filtered = filterByAllowedRoles(registry, "planner");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].manifest.name).toBe("open");
  });

  it("includes skills that explicitly allow the role", () => {
    const skills = new Map();
    skills.set("admin-skill", createSkillDefinition(
      createSkillManifest({ name: "admin-skill", version: "1.0.0", description: "Adm", allowedRoles: ["admin", "reviewer"] }),
      "body",
    ));
    const registry = createSkillRegistry({ skills });

    const filtered = filterByAllowedRoles(registry, "admin");

    expect(filtered).toHaveLength(1);
  });

  it("returns empty array for empty registry", () => {
    const registry = createSkillRegistry();
    expect(filterByAllowedRoles(registry, "planner")).toEqual([]);
  });
});

describe("hasPlanModeSuggestion", () => {
  it("returns true when suggestedMode is plan", () => {
    const skill = createSkillDefinition(
      createSkillManifest({ name: "test", version: "1.0.0", description: "D", suggestedMode: "plan" }),
      "body",
    );
    expect(hasPlanModeSuggestion(skill)).toBe(true);
  });

  it("returns false when suggestedMode is undefined", () => {
    const skill = createSkillDefinition(
      createSkillManifest({ name: "test", version: "1.0.0", description: "D" }),
      "body",
    );
    expect(hasPlanModeSuggestion(skill)).toBe(false);
  });
});

describe("getPlanModeSkills", () => {
  it("returns only plan-mode skills from registry", () => {
    const skills = new Map();
    skills.set("plan-skill", createSkillDefinition(
      createSkillManifest({ name: "plan-skill", version: "1.0.0", description: "P", suggestedMode: "plan" }),
      "body",
    ));
    skills.set("direct-skill", createSkillDefinition(
      createSkillManifest({ name: "direct-skill", version: "1.0.0", description: "D" }),
      "body",
    ));
    const registry = createSkillRegistry({ skills });

    const planSkills = getPlanModeSkills(registry);

    expect(planSkills).toHaveLength(1);
    expect(planSkills[0].manifest.name).toBe("plan-skill");
  });

  it("returns empty for registry with no plan skills", () => {
    const skills = new Map();
    skills.set("direct-skill", createSkillDefinition(
      createSkillManifest({ name: "direct-skill", version: "1.0.0", description: "D" }),
      "body",
    ));
    const registry = createSkillRegistry({ skills });

    expect(getPlanModeSkills(registry)).toEqual([]);
  });
});
