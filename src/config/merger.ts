export function mergeConfigs(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(override)) {
    if (!Object.prototype.hasOwnProperty.call(override, key)) continue;
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }

    const overrideVal = override[key];
    const baseVal = result[key];

    if (overrideVal === null) {
      result[key] = null;
    } else if (Array.isArray(overrideVal)) {
      const baseArr = Array.isArray(baseVal) ? baseVal : [];
      const merged = [...baseArr];
      for (const item of overrideVal) {
        if (!merged.includes(item)) {
          merged.push(item);
        }
      }
      result[key] = merged;
    } else if (isPlainObject(overrideVal) && isPlainObject(baseVal)) {
      result[key] = mergeConfigs(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>,
      );
    } else {
      result[key] = overrideVal;
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
