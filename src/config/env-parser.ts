const KEY_MAP: Record<string, string> = {
  api_key: "apiKey",
  model: "model",
  max_turns: "maxTurns",
  base_url: "baseUrl",
  fallback_model: "fallbackModel",
  fallback_base_url: "fallbackBaseUrl",
  permissions_autoapprove: "permissions.autoApprove",
  permissions_deny: "permissions.deny",
  permissions_asktimeout: "permissions.askTimeout",
  rules_file: "rulesFile",
  verbose: "verbose",
};

export function parseEnvVars(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("SUPERAGENT_") || value === undefined) continue;
    if (value === "") continue;

    const stripped = key.slice("SUPERAGENT_".length).toLowerCase();
    const mapped = KEY_MAP[stripped];
    if (!mapped) continue;

    const coerced = coerceValue(value);
    const dotIdx = mapped.indexOf(".");
    if (dotIdx !== -1) {
      const parent = mapped.slice(0, dotIdx);
      const child = mapped.slice(dotIdx + 1);
      if (!result[parent]) result[parent] = {};
      const parentObj = result[parent] as Record<string, unknown>;
      parentObj[child] = parseJsonValue(coerced);
    } else {
      result[mapped] = coerced;
    }
  }

  return result;
}

function coerceValue(value: string): unknown {
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}
