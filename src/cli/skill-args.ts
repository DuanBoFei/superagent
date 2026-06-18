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
    const eqIdx = argsParts[i].indexOf("=");
    if (eqIdx !== -1) {
      // Named argument
      skillArgs[argsParts[i].slice(0, eqIdx)] = argsParts[i].slice(eqIdx + 1);
    } else {
      // Positional argument - try to map to first unfilled argument
      if (registry) {
        const skill = registry.skills.get(skillName);
        if (skill) {
          const posArg = skill.manifest.arguments.find((a) => !(a.name in skillArgs));
          if (posArg) {
            skillArgs[posArg.name] = argsParts[i];
            continue;
          }
        }
      }
      // Fallback: use positional index
      skillArgs[`arg${i}`] = argsParts[i];
    }
  }

  return skillArgs;
}
