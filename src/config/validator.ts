import { z } from "zod/v4";
import { ConfigError } from "./types";
import { defaults } from "./defaults";
import { browserConfigSchema } from "../browser/schema";
import { sandboxConfigSchema } from "../sandbox/schema";
import { HOOK_EVENTS, isObserveOnlyHookEvent } from "../hooks/types";
import type { Config } from "./types";
import type { HookConfig, HookEventName } from "../hooks/types";

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

const hookMatcherSchema = z.object({
  tool: z.string().optional(),
  inputPattern: z.string().optional(),
  promptPattern: z.string().optional(),
});

const enabledHookSchema = z.object({
  name: z.string().min(1),
  enabled: z.literal(true),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: safeRecordSchema,
  timeoutMs: z.number().int().positive().default(3000),
  blocking: z.boolean().optional(),
  matcher: hookMatcherSchema.optional(),
});

const disabledHookSchema = z.object({
  name: z.string().min(1),
  enabled: z.literal(false),
  command: z.string().min(1).optional(),
  args: z.array(z.string()).default([]),
  env: safeRecordSchema,
  timeoutMs: z.number().int().positive().default(3000),
  blocking: z.boolean().optional(),
  matcher: hookMatcherSchema.optional(),
});

const hookConfigSchema = z.discriminatedUnion("enabled", [enabledHookSchema, disabledHookSchema]);
const hooksSchema = z.partialRecord(z.enum(HOOK_EVENTS), z.array(hookConfigSchema)).default({});

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
  hooks: hooksSchema,
  sandbox: sandboxConfigSchema.default(defaults.sandbox),
  browser: browserConfigSchema.default(defaults.browser),
});

const KNOWN_KEYS = new Set(Object.keys(configSchema.shape));
const NESTED_KEYS = new Set(["permissions", "mcpServers", "hooks", "sandbox", "browser"]);
const PERMISSION_KEYS = new Set(Object.keys(permissionsSchema.shape));
const HOOK_EVENT_NAMES = new Set<HookEventName>(HOOK_EVENTS);

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

  const hooksRaw = raw.hooks as Record<string, unknown> | undefined;
  if (hooksRaw && typeof hooksRaw === "object" && !Array.isArray(hooksRaw)) {
    merged.hooks = parseHooksConfig(hooksRaw, warnings);
  }

  if (!merged.apiKey || merged.apiKey.trim() === "") {
    throw new ConfigError(
      "MISSING_REQUIRED_KEY",
      "API key not configured. Set SUPERAGENT_API_KEY environment variable or add 'apiKey' to ~/.superagent/settings.json",
    );
  }

  return { config: merged, warnings };
}

function parseHooksConfig(
  hooksRaw: Record<string, unknown>,
  warnings: string[],
): Config["hooks"] {
  const parsedHooks: Config["hooks"] = {};

  for (const [eventName, hookEntries] of Object.entries(hooksRaw)) {
    if (!HOOK_EVENT_NAMES.has(eventName as HookEventName)) {
      warnings.push(`Warning: invalid value for 'hooks.${eventName}', using default (undefined)`);
      continue;
    }

    if (!Array.isArray(hookEntries)) {
      warnings.push(`Warning: invalid value for 'hooks.${eventName}', using default (undefined)`);
      continue;
    }

    const parsedEventHooks: HookConfig[] = [];
    for (const [index, hookEntry] of hookEntries.entries()) {
      const parsed = hookConfigSchema.safeParse(hookEntry);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const issuePath = issue.path.length > 0 ? issue.path : ["command"];
          const path = ["hooks", eventName, index, ...issuePath].join(".");
          warnings.push(`Warning: invalid value for '${path}', using default (undefined)`);
        }
        continue;
      }

      if (parsed.data.blocking === true && isObserveOnlyHookEvent(eventName as HookEventName)) {
        warnings.push(`Warning: invalid value for 'hooks.${eventName}.${index}.blocking', using default (undefined)`);
        continue;
      }

      parsedEventHooks.push(parsed.data as HookConfig);
    }

    parsedHooks[eventName as HookEventName] = parsedEventHooks;
  }

  return parsedHooks;
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
