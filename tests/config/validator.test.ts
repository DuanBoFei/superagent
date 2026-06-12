import { describe, expect, it } from "vitest";
import { validateConfig } from "../../src/config/validator";
import { ConfigError } from "../../src/config/types";
import { defaults } from "../../src/config/defaults";

describe("validateConfig", () => {
  it("valid config passes without warnings", () => {
    const { config, warnings } = validateConfig({
      ...defaults,
      apiKey: "sk-test",
    });
    expect(warnings).toEqual([]);
    expect(config.apiKey).toBe("sk-test");
  });

  it("missing apiKey throws ConfigError", () => {
    expect(() =>
      validateConfig({ ...defaults, apiKey: "" }),
    ).toThrow(ConfigError);
    try {
      validateConfig({ ...defaults, apiKey: "" });
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).code).toBe("MISSING_REQUIRED_KEY");
    }
  });

  it("unknown key emits warning and strips key", () => {
    const { config, warnings } = validateConfig({
      ...defaults,
      apiKey: "sk-test",
      unknownFutureOption: true,
    });
    expect(warnings).toContain(
      "Warning: unknown config key 'unknownFutureOption' ignored.",
    );
    expect((config as Record<string, unknown>).unknownFutureOption).toBeUndefined();
  });

  it("invalid maxTurns type uses default with warning", () => {
    const { config, warnings } = validateConfig({
      ...defaults,
      apiKey: "sk-test",
      maxTurns: "notanumber",
    });
    expect(warnings.some((w) => w.includes("maxTurns"))).toBe(true);
    expect(config.maxTurns).toBe(defaults.maxTurns);
  });

  it("negative maxTurns uses default with warning", () => {
    const { config, warnings } = validateConfig({
      ...defaults,
      apiKey: "sk-test",
      maxTurns: -5,
    });
    expect(warnings.some((w) => w.includes("maxTurns"))).toBe(true);
    expect(config.maxTurns).toBe(defaults.maxTurns);
  });

  it("invalid baseUrl uses default with warning", () => {
    const { config, warnings } = validateConfig({
      ...defaults,
      apiKey: "sk-test",
      baseUrl: "not-a-url",
    });
    expect(warnings.some((w) => w.includes("baseUrl"))).toBe(true);
    expect(config.baseUrl).toBe(defaults.baseUrl);
  });

  it("invalid askTimeout uses default with warning", () => {
    const { config, warnings } = validateConfig({
      ...defaults,
      apiKey: "sk-test",
      permissions: { ...defaults.permissions, askTimeout: 0 },
    });
    expect(warnings.some((w) => w.includes("askTimeout"))).toBe(true);
    expect(config.permissions.askTimeout).toBe(defaults.permissions.askTimeout);
  });
});
