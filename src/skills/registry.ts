import type { SkillDefinition, SkillDiagnostic, SkillRegistry } from "./types";
import { createSkillDiagnostic } from "./types";

export interface GetSkillResult {
  skill?: SkillDefinition;
  error?: SkillDiagnostic;
}

export function listSkills(registry: SkillRegistry): string[] {
  return [...registry.skills.keys()].sort();
}

export function getSkill(registry: SkillRegistry, name: string): GetSkillResult {
  const skill = registry.skills.get(name);
  if (skill) {
    return { skill };
  }

  const available = listSkills(registry);
  return {
    error: createSkillDiagnostic({
      skillName: name,
      filePath: "",
      reason: "not-found",
      message:
        available.length > 0
          ? `Skill "${name}" not found. Available skills: ${available.join(", ")}.`
          : `Skill "${name}" not found. No skills are available.`,
    }),
  };
}
