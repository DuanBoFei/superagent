import * as fs from "node:fs";
import * as path from "node:path";
import type { SkillDiagnostic, SkillDefinition, SkillRegistry } from "./types";
import { createSkillRegistry, createSkillDefinition, createSkillDiagnostic } from "./types";
import { parseSkillManifest, parseSkillFrontmatter } from "./manifest";
import { validateSkill } from "./validator";
import type { ValidationOptions } from "./validator";

export interface DiscoveryResult {
  registry: SkillRegistry;
  diagnostics: SkillDiagnostic[];
}

export function discoverSkills(
  directories: string[],
  options: ValidationOptions,
): DiscoveryResult {
  const skills = new Map<string, SkillDefinition>();
  const diagnostics: SkillDiagnostic[] = [];
  const sourceOrder: string[] = [];

  for (const dir of directories) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      continue;
    }
    sourceOrder.push(dir);

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const subdirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    for (const subdir of subdirs) {
      const skillDir = path.join(dir, subdir);
      const skillFile = path.join(skillDir, "SKILL.md");

      if (!fs.existsSync(skillFile)) {
        continue;
      }

      const content = fs.readFileSync(skillFile, "utf-8");
      const manifest = parseSkillManifest(content, skillFile);

      if (!manifest) {
        const parsed = parseSkillFrontmatter(content);
        const skillName =
          parsed && typeof parsed.metadata.name === "string"
            ? parsed.metadata.name
            : subdir;
        diagnostics.push(
          createSkillDiagnostic({
            skillName,
            filePath: skillFile,
            reason: "parse-error",
            message: `Failed to parse SKILL.md manifest for "${skillName}".`,
          }),
        );
        continue;
      }

      const parsed = parseSkillFrontmatter(content);
      const body = parsed?.body ?? "";

      const validationDiags = validateSkill(manifest, body, options);
      diagnostics.push(...validationDiags);

      const blocked = validationDiags.some(
        (d) =>
          d.reason === "invalid-name" || d.reason === "invalid-version",
      );

      if (blocked) {
        continue;
      }

      if (skills.has(manifest.name)) {
        diagnostics.push(
          createSkillDiagnostic({
            skillName: manifest.name,
            filePath: skillFile,
            reason: "duplicate-name",
            message: `Duplicate skill name "${manifest.name}" — earlier definition takes precedence.`,
          }),
        );
        continue;
      }

      skills.set(manifest.name, createSkillDefinition(manifest, body));
    }
  }

  return {
    registry: createSkillRegistry({ skills, diagnostics, sourceOrder }),
    diagnostics,
  };
}
