import { describe, expect, it } from "vitest";
import { createRuntime } from "../../src/runtime/runtime";
import { createSkillManifest, createSkillDefinition } from "../../src/skills/types";
import { hasPlanModeSuggestion } from "../../src/skills/routing";
import { discoverSkills } from "../../src/skills/discovery";
import { createPlanIntegration } from "../../src/planning/integration";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("T037: skill suggestedMode routing", () => {
  describe("hasPlanModeSuggestion helper", () => {
    it("returns true when skill manifest suggests plan mode", () => {
      const skill = createSkillDefinition(
        createSkillManifest({
          name: "plan-skill",
          version: "1.0.0",
          description: "Requires plan mode",
          suggestedMode: "plan",
        }),
        "Instructions.",
      );
      expect(hasPlanModeSuggestion(skill)).toBe(true);
    });

    it("returns false when skill does not suggest plan mode", () => {
      const skill = createSkillDefinition(
        createSkillManifest({
          name: "direct-skill",
          version: "1.0.0",
          description: "No plan needed",
        }),
        "Instructions.",
      );
      expect(hasPlanModeSuggestion(skill)).toBe(false);
    });
  });

  describe("planner detect with skillSuggestedPlan", () => {
    it("returns PlanRequested when skillSuggestedPlan is true", () => {
      const plan = createPlanIntegration();
      const decision = plan.detect("do the work", true);
      expect(decision).toBe("plan-requested");
    });

    it("returns Direct when skillSuggestedPlan is false/undefined for simple prompt", () => {
      const plan = createPlanIntegration();
      const decision = plan.detect("what is 2+2", false);
      expect(decision).toBe("direct");
    });
  });

  describe("runtime skill -> planner bridge", () => {
    function setupSkillWithSuggestedMode(suggestedMode: "plan" | undefined): {
      registry: ReturnType<typeof discoverSkills>["registry"];
      skillName: string;
    } {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-routing-"));
      const skillDir = path.join(dir, "test-skill");
      fs.mkdirSync(skillDir);

      const frontmatter = [
        "---",
        "name: test-skill",
        "version: 1.0.0",
        "description: A test skill",
        ...(suggestedMode ? ["suggestedMode: plan"] : []),
        "---",
        "# Instructions",
        "Do the work.",
      ].join("\n");

      fs.writeFileSync(path.join(skillDir, "SKILL.md"), frontmatter, "utf-8");

      const { registry } = discoverSkills([dir], { maxBodySize: 65536 });
      fs.rmSync(dir, { recursive: true, force: true });
      return { registry, skillName: "test-skill" };
    }

    it("runtime exposes helper to check if active skill suggests plan mode", () => {
      const { registry, skillName } = setupSkillWithSuggestedMode("plan");
      const runtime = createRuntime({ skillRegistry: registry });

      runtime.setActiveSkill(skillName, {});

      // Check that runtime exposes a way to check if active skill wants plan mode
      expect(typeof runtime.hasActiveSkillPlanSuggestion).toBe("function");
      expect(runtime.hasActiveSkillPlanSuggestion()).toBe(true);
    });

    it("hasActiveSkillPlanSuggestion returns false when active skill does not suggest plan", () => {
      const { registry, skillName } = setupSkillWithSuggestedMode(undefined);
      const runtime = createRuntime({ skillRegistry: registry });

      runtime.setActiveSkill(skillName, {});

      expect(runtime.hasActiveSkillPlanSuggestion()).toBe(false);
    });

    it("hasActiveSkillPlanSuggestion returns false when no skill is active", () => {
      const { registry, skillName } = setupSkillWithSuggestedMode("plan");
      const runtime = createRuntime({ skillRegistry: registry });

      // Don't set active skill
      expect(runtime.hasActiveSkillPlanSuggestion()).toBe(false);

      // Set then clear
      runtime.setActiveSkill(skillName, {});
      runtime.clearActiveSkill();
      expect(runtime.hasActiveSkillPlanSuggestion()).toBe(false);
    });

    it("hasActiveSkillPlanSuggestion returns false when no skillRegistry", () => {
      const runtime = createRuntime();
      expect(runtime.hasActiveSkillPlanSuggestion()).toBe(false);
    });
  });
});
