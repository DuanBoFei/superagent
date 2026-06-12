import { homedir } from "node:os";
import { join } from "node:path";
import { defaults } from "./defaults";
import type { Config, ConfigLoadResult } from "./types";
import { loadConfigFile } from "./loader";
import { mergeConfigs } from "./merger";
import { parseEnvVars } from "./env-parser";
import { validateConfig } from "./validator";

export interface GetConfigOptions {
  globalConfigDir?: string;
  projectConfigDir?: string;
  env?: Record<string, string | undefined>;
}

export function getConfig(options: GetConfigOptions = {}): ConfigLoadResult {
  const globalDir = options.globalConfigDir ?? join(homedir(), ".superagent");
  const projectDir = options.projectConfigDir ?? join(process.cwd(), ".superagent");
  const envObj = options.env ?? (process.env as Record<string, string | undefined>);

  const warnings: string[] = [];

  let merged: Record<string, unknown> = { ...defaults };

  try {
    const globalFile = loadConfigFile(join(globalDir, "settings.json"));
    if (globalFile !== null) {
      merged = mergeConfigs(merged, globalFile as Record<string, unknown>);
    }
  } catch (e) {
    warnings.push(`Warning: ${(e as Error).message}`);
  }

  try {
    const projectFile = loadConfigFile(join(projectDir, "settings.json"));
    if (projectFile !== null) {
      merged = mergeConfigs(merged, projectFile as Record<string, unknown>);
    }
  } catch (e) {
    warnings.push(`Warning: ${(e as Error).message}`);
  }

  const envConfig = parseEnvVars(envObj);
  if (Object.keys(envConfig).length > 0) {
    merged = mergeConfigs(merged, envConfig);
  }

  const validated = validateConfig(merged);
  warnings.push(...validated.warnings);

  return { config: validated.config, warnings };
}
