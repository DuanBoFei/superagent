import type { SkillDefinition } from "./types";

export function renderSkillContext(
  skill: SkillDefinition,
  args: Record<string, string>,
): string {
  const { manifest, body } = skill;

  const lines: string[] = [];

  lines.push("<!-- SKILL CONTEXT BEGIN -->");
  lines.push(`## Skill: ${manifest.name}`);
  lines.push(`**Description**: ${manifest.description}`);
  lines.push(`**Version**: ${manifest.version}`);

  if (manifest.suggestedMode) {
    lines.push(`**Suggested Mode**: ${manifest.suggestedMode}`);
  }

  if (manifest.allowedRoles && manifest.allowedRoles.length > 0) {
    lines.push(`**Allowed Roles**: ${manifest.allowedRoles.join(", ")}`);
  }

  if (manifest.arguments.length > 0) {
    lines.push("");
    lines.push("### Arguments");
    for (const arg of manifest.arguments) {
      const provided = args[arg.name];
      const valueStr = provided ? ` → \`${provided}\`` : " (not provided)";
      const reqStr = arg.required ? " (required)" : " (optional)";
      lines.push(`- **${arg.name}**${reqStr}: ${arg.description}${valueStr}`);
    }
  }

  if (Object.keys(args).length > 0) {
    const extraArgs = Object.keys(args).filter(
      (k) => !manifest.arguments.some((a) => a.name === k),
    );
    if (extraArgs.length > 0) {
      lines.push("");
      lines.push("### Extra Arguments");
      for (const k of extraArgs) {
        lines.push(`- **${k}**: \`${args[k]}\``);
      }
    }
  }

  lines.push("");
  lines.push("### Instructions");
  lines.push("");
  lines.push(body);

  if (!body.endsWith("\n")) {
    lines.push("");
  }

  lines.push("<!-- SKILL CONTEXT END -->");

  return lines.join("\n");
}
