import type { SkillDefinition, SkillRegistry } from "./types";

export function filterByAllowedRoles(
  registry: SkillRegistry,
  role: string,
): SkillDefinition[] {
  const results: SkillDefinition[] = [];
  for (const skill of registry.skills.values()) {
    const roles = skill.manifest.allowedRoles;
    if (!roles || roles.length === 0 || roles.includes(role)) {
      results.push(skill);
    }
  }
  return results;
}

export function hasPlanModeSuggestion(skill: SkillDefinition): boolean {
  return skill.manifest.suggestedMode === "plan";
}

export function getPlanModeSkills(registry: SkillRegistry): SkillDefinition[] {
  const results: SkillDefinition[] = [];
  for (const skill of registry.skills.values()) {
    if (hasPlanModeSuggestion(skill)) {
      results.push(skill);
    }
  }
  return results;
}
