import type { SkillDiagnostic, SkillManifest } from "./types";
import { createSkillDiagnostic } from "./types";

export function validateArgs(
  manifest: SkillManifest,
  args: Record<string, string>,
): SkillDiagnostic[] {
  const diags: SkillDiagnostic[] = [];

  for (const arg of manifest.arguments) {
    if (arg.required && (!args[arg.name] || args[arg.name].trim() === "")) {
      diags.push(
        createSkillDiagnostic({
          skillName: manifest.name,
          filePath: manifest.entry,
          reason: "missing-arg",
          message: `Required argument "${arg.name}" is missing for skill "${manifest.name}".`,
        }),
      );
    }
  }

  return diags;
}
