import type { SkillRegistry } from "../skills/types";

/**
 * Parses command-line arguments for skill invocation.
 * Supports:
 * - Named arguments: key=value
 * - Positional arguments: mapped to first unfilled skill argument (if skill exists)
 * - Fallback: argN when skill has no defined arguments
 */
export function parseSkillArgs(
  skillName: string,
  argsParts: string[],
  registry?: SkillRegistry,
): Record<string, string> {
  const skillArgs: Record<string, string> = {};

  for (let i = 0; i < argsParts.length; i++) {
    const part = argsParts[i] ?? "";
    const eqIdx = part.indexOf("=");
    if (eqIdx !== -1) {
      // Named argument
      const key = part.slice(0, eqIdx);
      const value = part.slice(eqIdx + 1);
      if (key) {
        skillArgs[key] = value;
      }
    } else {
      // Positional argument - try to map to first unfilled argument
      const skill = registry?.skills.get(skillName);
      if (skill?.manifest.arguments) {
        const posArg = skill.manifest.arguments.find((a) => !(a.name in skillArgs));
        if (posArg?.name) {
          skillArgs[posArg.name] = part;
          continue;
        }
      }
      // Fallback: use positional index
      skillArgs[`arg${i}`] = part;
    }
  }

  return skillArgs;
}
