import { z } from "zod/v4";
import { ConfigError } from "./types";
import { defaults } from "./defaults";
import type { Config } from "./types";

export const permissionsSchema = z.object({
  autoApprove: z.array(z.string()),
  deny: z.array(z.string()),
  askTimeout: z.number().int().min(5).max(300),
});

const safeRecordSchema = z.record(z.string(), z.string()).default({});

const mcpStdioServerSchema = z.object({
  enabled: z.boolean().default(true),
  transport: z.literal("stdio"),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: safeRecordSchema,
});

const mcpHttpServerSchema = z.object({
  enabled: z.boolean().default(true),
  transport: z.literal("http"),
  url: z.string().url(),
  headers: safeRecordSchema,
});

export const mcpServerSchema = z.discriminatedUnion("transport", [
  mcpStdioServerSchema,
  mcpHttpServerSchema,
]);

export const mcpServersSchema = z.record(z.string().min(1), mcpServerSchema).default({});

export const configSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string(),
  baseUrl: z.string().url(),
  maxTurns: z.number().int().min(1).max(500),
  fallbackModel: z.string(),
  fallbackBaseUrl: z.string().url(),
  permissions: permissionsSchema,
  rulesFile: z.string(),
  mcpServers: mcpServersSchema,
});

const KNOWN_KEYS = new Set(Object.keys(configSchema.shape));
const NESTED_KEYS = new Set(["permissions", "mcpServers"]);
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

  const mcpServersRaw = raw.mcpServers as Record<string, unknown> | undefined;
  if (mcpServersRaw && typeof mcpServersRaw === "object" && !Array.isArray(mcpServersRaw)) {
    const parsedServers: Record<string, unknown> = {};
    for (const [serverName, serverConfig] of Object.entries(mcpServersRaw)) {
      const parsed = mcpServerSchema.safeParse(serverConfig);
      if (parsed.success) {
        parsedServers[serverName] = parsed.data;
        continue;
      }

      for (const issue of parsed.error.issues) {
        const path = ["mcpServers", serverName, ...issue.path].join(".");
        warnings.push(`Warning: invalid value for '${path}', using default (undefined)`);
      }
    }
    merged.mcpServers = parsedServers as Config["mcpServers"];
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
