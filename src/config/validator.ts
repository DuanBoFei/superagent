import { z } from "zod/v4";
import { ConfigError } from "./types";
import { defaults } from "./defaults";
import type { Config } from "./types";

export const permissionsSchema = z.object({
  autoApprove: z.array(z.string()),
  deny: z.array(z.string()),
  askTimeout: z.number().int().min(5).max(300),
});

export const configSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string(),
  baseUrl: z.string().url(),
  maxTurns: z.number().int().min(1).max(500),
  fallbackModel: z.string(),
  fallbackBaseUrl: z.string().url(),
  permissions: permissionsSchema,
  rulesFile: z.string(),
});

const KNOWN_KEYS = new Set(Object.keys(configSchema.shape));
const NESTED_KEYS = new Set(["permissions"]);
const PERMISSION_KEYS = new Set(Object.keys(permissionsSchema.shape));

export function validateConfig(raw: Record<string, unknown>): {
  config: Config;
  warnings: string[];
} {
  const warnings: string[] = [];

  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key) && !NESTED_KEYS.has(key)) {
      warnings.push(`Warning: unknown config key '${key}' ignored.`);
    }
  }

  const permissionRaw = raw.permissions as Record<string, unknown> | undefined;
  if (permissionRaw && typeof permissionRaw === "object") {
    for (const key of Object.keys(permissionRaw)) {
      if (!PERMISSION_KEYS.has(key)) {
        warnings.push(`Warning: unknown config key 'permissions.${key}' ignored.`);
      }
    }
  }

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      warnings.push(
        `Warning: invalid value for '${path}', using default (${getDefaultForPath(issue.path as (string | number)[])})`,
      );
    }
  }

  const merged = { ...defaults };
  for (const key of KNOWN_KEYS) {
    const val = raw[key];
    if (val !== undefined && key !== "permissions") {
      const parsed = configSchema.shape[key as keyof typeof configSchema.shape].safeParse(val);
      if (parsed.success) {
        (merged as Record<string, unknown>)[key] = parsed.data;
      }
    }
  }

  if (permissionRaw && typeof permissionRaw === "object") {
    for (const key of PERMISSION_KEYS) {
      const val = permissionRaw[key];
      if (val !== undefined) {
        const parsed = permissionsSchema.shape[key as keyof typeof permissionsSchema.shape].safeParse(val);
        if (parsed.success) {
          (merged.permissions as Record<string, unknown>)[key] = parsed.data;
        }
      }
    }
  }

  if (!merged.apiKey || merged.apiKey.trim() === "") {
    throw new ConfigError(
      "MISSING_REQUIRED_KEY",
      "API key not configured. Set SUPERAGENT_API_KEY environment variable or add 'apiKey' to ~/.superagent/settings.json",
    );
  }

  return { config: merged, warnings };
}

function getDefaultForPath(path: (string | number)[]): string {
  let value: unknown = defaults;
  for (const segment of path) {
    if (value && typeof value === "object") {
      value = (value as Record<string, unknown>)[String(segment)];
    }
  }
  return String(value);
}
