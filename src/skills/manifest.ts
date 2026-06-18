import type { SkillManifest } from "./types";
import { createSkillArgument, createSkillManifest } from "./types";

export interface FrontmatterResult {
  metadata: Record<string, unknown>;
  body: string;
}

export function parseSkillFrontmatter(content: string): FrontmatterResult | null {
  const lines = content.split("\n");

  if (lines[0]?.trimEnd() !== "---") return null;

  const endIdx = lines.findIndex((l, i) => i > 0 && l.trimEnd() === "---");
  if (endIdx === -1) return null;

  const fmLines = lines.slice(1, endIdx);
  const metadata = parseYamlLines(fmLines);
  const bodyLines = lines.slice(endIdx + 1);
  // Trim leading empty lines from body
  let bodyStart = 0;
  while (bodyStart < bodyLines.length && bodyLines[bodyStart].trim() === "") {
    bodyStart++;
  }
  const body = bodyLines.slice(bodyStart).join("\n");

  return { metadata, body };
}

export function parseSkillManifest(
  content: string,
  filePath: string,
): SkillManifest | null {
  const parsed = parseSkillFrontmatter(content);
  if (!parsed) return null;

  const { metadata, body: _body } = parsed;

  const name = typeof metadata.name === "string" ? metadata.name : undefined;
  const description =
    typeof metadata.description === "string" ? metadata.description : undefined;
  const version =
    typeof metadata.version === "string" ? metadata.version : undefined;
  const entry =
    typeof metadata.entry === "string" ? metadata.entry : "SKILL.md";

  if (!name || !description || !version) return null;

  const rawArgs = metadata.arguments;
  const args = Array.isArray(rawArgs)
    ? rawArgs.map((a: Record<string, unknown>) =>
        createSkillArgument({
          name: String(a.name ?? ""),
          description: String(a.description ?? ""),
          required: Boolean(a.required),
        }),
      )
    : undefined;

  const suggestedMode =
    metadata.suggestedMode === "plan" ? ("plan" as const) : undefined;

  const allowedRoles = Array.isArray(metadata.allowedRoles)
    ? metadata.allowedRoles.map((r: unknown) => String(r))
    : undefined;

  return createSkillManifest({
    name,
    description,
    version,
    entry,
    arguments: args,
    suggestedMode,
    allowedRoles,
  });
}

// Minimal YAML subset parser — handles key:value, lists, nested objects
function parseYamlLines(lines: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      i++;
      continue;
    }

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx !== -1 && indent === 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (value === "") {
        // Could be a list or nested object on subsequent lines
        const subResult = parseIndentedBlock(lines, i + 1, indent + 2);
        result[key] = subResult.value;
        i = subResult.nextIdx;
        continue;
      } else {
        result[key] = parseScalar(value);
      }
    }

    i++;
  }

  return result;
}

function parseScalar(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  if (/^\d+\.\d+$/.test(raw)) return Number(raw);
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1);
    if (inner.trim() === "") return [];
    return inner.split(",").map((s) => parseScalar(s.trim()));
  }
  return raw;
}

function parseIndentedBlock(
  lines: string[],
  startIdx: number,
  minIndent: number,
): { value: unknown; nextIdx: number } {
  let i = startIdx;
  const items: unknown[] = [];
  const nested: Record<string, unknown> = {};

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    const indent = line.search(/\S/);
    if (indent < minIndent) break;

    const trimmed = line.trim();
    const dashMatch = trimmed.match(/^-\s+(.*)/);

    if (dashMatch) {
      // List item
      const rest = dashMatch[1];
      const colonIdx = rest.indexOf(":");
      if (colonIdx !== -1) {
        // Item with key:value pairs on same and subsequent lines
        const item: Record<string, unknown> = {};
        const key = rest.slice(0, colonIdx).trim();
        const value = rest.slice(colonIdx + 1).trim();
        if (value !== "") {
          item[key] = parseScalar(value);
        }
        // Collect further indented keys for this item
        i++;
        while (i < lines.length) {
          const nl = lines[i];
          if (nl.trim() === "") {
            i++;
            continue;
          }
          const nIndent = nl.search(/\S/);
          if (nIndent <= indent) break;
          const nTrimmed = nl.trim();
          const nColon = nTrimmed.indexOf(":");
          if (nColon !== -1) {
            const nKey = nTrimmed.slice(0, nColon).trim();
            const nValue = nTrimmed.slice(nColon + 1).trim();
            item[nKey] = parseScalar(nValue);
          }
          i++;
        }
        items.push(item);
        continue;
      } else {
        items.push(parseScalar(rest));
      }
    } else {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1) {
        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();
        nested[key] = value !== "" ? parseScalar(value) : undefined;
      }
    }
    i++;
  }

  if (items.length > 0) return { value: items, nextIdx: i };
  return { value: nested, nextIdx: i };
}
