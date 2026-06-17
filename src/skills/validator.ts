import type { SkillDiagnostic, SkillManifest } from "./types";
import { createSkillDiagnostic } from "./types";

export const DEFAULT_MAX_BODY_SIZE = 10000;

export interface ValidationOptions {
  maxBodySize: number;
}

const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function validateSkill(
  manifest: SkillManifest,
  body: string,
  options: ValidationOptions,
): SkillDiagnostic[] {
  const diags: SkillDiagnostic[] = [];
  const filePath = manifest.entry;

  if (!manifest.name || manifest.name.trim() === "") {
    diags.push(
      createSkillDiagnostic({
        skillName: manifest.name || "(unknown)",
        filePath,
        reason: "missing-name",
        message: "Skill manifest missing required field: name",
      }),
    );
  } else if (!NAME_PATTERN.test(manifest.name)) {
    diags.push(
      createSkillDiagnostic({
        skillName: manifest.name,
        filePath,
        reason: "invalid-name",
        message: `Skill name "${manifest.name}" is invalid. Must be kebab-case (lowercase letters, digits, hyphens).`,
      }),
    );
  }

  if (!manifest.description || manifest.description.trim() === "") {
    diags.push(
      createSkillDiagnostic({
        skillName: manifest.name || "(unknown)",
        filePath,
        reason: "missing-description",
        message: "Skill manifest missing required field: description",
      }),
    );
  }

  if (!manifest.version || manifest.version.trim() === "") {
    diags.push(
      createSkillDiagnostic({
        skillName: manifest.name || "(unknown)",
        filePath,
        reason: "missing-version",
        message: "Skill manifest missing required field: version",
      }),
    );
  } else if (!VERSION_PATTERN.test(manifest.version)) {
    diags.push(
      createSkillDiagnostic({
        skillName: manifest.name,
        filePath,
        reason: "invalid-version",
        message: `Skill version "${manifest.version}" is not valid semver (x.y.z).`,
      }),
    );
  }

  for (const arg of manifest.arguments) {
    if (!arg.name || arg.name.trim() === "") {
      diags.push(
        createSkillDiagnostic({
          skillName: manifest.name,
          filePath,
          reason: "missing-name",
          message: "Skill argument missing required field: name",
        }),
      );
    }
  }

  if (body.length > options.maxBodySize) {
    diags.push(
      createSkillDiagnostic({
        skillName: manifest.name,
        filePath,
        reason: "body-too-large",
        message: `Skill body is ${body.length} bytes (max ${options.maxBodySize}).`,
      }),
    );
  }

  return diags;
}
