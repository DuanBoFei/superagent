import { describe, expect, it } from "vitest";
import { defaults } from "../../src/config/defaults";
import { validateConfig } from "../../src/config/validator";

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    ...defaults,
    apiKey: "sk-test",
    ...overrides,
  };
}

describe("browser config contract", () => {
  it("omitted browser defaults to disabled config", () => {
    const { config, warnings } = validateConfig(validConfig());

    expect(warnings).toEqual([]);
    expect(config.browser).toEqual({
      enabled: false,
      headless: true,
      defaultTimeoutMs: 30000,
      artifactDir: ".superagent/browser-artifacts",
      viewport: { width: 1280, height: 720 },
      network: "enabled",
      captureScreenshots: true,
    });
  });

  it("disabled browser preserves config", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        browser: {
          enabled: false,
          headless: false,
          defaultTimeoutMs: 10000,
          artifactDir: ".superagent/custom-browser-artifacts",
          viewport: { width: 1024, height: 768 },
          network: "disabled",
          captureScreenshots: false,
        },
      }),
    );

    expect(warnings).toEqual([]);
    expect(config.browser).toEqual({
      enabled: false,
      headless: false,
      defaultTimeoutMs: 10000,
      artifactDir: ".superagent/custom-browser-artifacts",
      viewport: { width: 1024, height: 768 },
      network: "disabled",
      captureScreenshots: false,
    });
  });

  it("invalid timeout fails validation and falls back to disabled default", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        browser: {
          enabled: true,
          defaultTimeoutMs: 0,
        },
      }),
    );

    expect(config.browser).toEqual(defaults.browser);
    expect(warnings.some((warning) => warning.includes("browser.defaultTimeoutMs"))).toBe(true);
  });

  it("invalid viewport fails validation and falls back to disabled default", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        browser: {
          enabled: true,
          viewport: { width: 0, height: 720 },
        },
      }),
    );

    expect(config.browser).toEqual(defaults.browser);
    expect(warnings.some((warning) => warning.includes("browser.viewport.width"))).toBe(true);
  });

  it("unknown network fails validation and falls back to disabled default", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        browser: {
          enabled: true,
          network: "internet",
        },
      }),
    );

    expect(config.browser).toEqual(defaults.browser);
    expect(warnings.some((warning) => warning.includes("browser.network"))).toBe(true);
  });

  it("artifactDir outside allowed local path policy fails validation and falls back to disabled default", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        browser: {
          enabled: true,
          artifactDir: "../outside",
        },
      }),
    );

    expect(config.browser).toEqual(defaults.browser);
    expect(warnings.some((warning) => warning.includes("browser.artifactDir"))).toBe(true);
  });

  it("secret-like config diagnostics are redacted", () => {
    const { warnings } = validateConfig(
      validConfig({
        browser: {
          enabled: true,
          artifactDir: "../sk-secret-token",
        },
      }),
    );

    expect(warnings.join("\n")).not.toContain("sk-secret-token");
  });
});
