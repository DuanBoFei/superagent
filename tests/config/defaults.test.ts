import { describe, expect, it } from "vitest";
import { defaults } from "../../src/config/defaults";
import type { Config } from "../../src/config/types";

describe("defaults", () => {
  it("has apiKey as empty string", () => {
    expect(defaults.apiKey).toBe("");
  });

  it("defaults model to deepseek-v4-pro", () => {
    expect(defaults.model).toBe("deepseek-v4-pro");
  });

  it("defaults baseUrl to DeepSeek API", () => {
    expect(defaults.baseUrl).toBe("https://api.deepseek.com");
  });

  it("defaults maxTurns to 50", () => {
    expect(defaults.maxTurns).toBe(50);
  });

  it("defaults fallbackModel to deepseek-v4-flash", () => {
    expect(defaults.fallbackModel).toBe("deepseek-v4-flash");
  });

  it("defaults fallbackBaseUrl to DeepSeek API", () => {
    expect(defaults.fallbackBaseUrl).toBe("https://api.deepseek.com");
  });

  it("defaults autoApprove to empty array", () => {
    expect(defaults.permissions.autoApprove).toEqual([]);
  });

  it("defaults deny to dangerous command patterns", () => {
    expect(defaults.permissions.deny).toContain("Bash:rm -rf *");
    expect(defaults.permissions.deny).toContain("Bash:curl * | bash");
    expect(defaults.permissions.deny).toContain("Bash:sudo *");
    expect(defaults.permissions.deny).toContain("Bash:git push --force *");
  });

  it("defaults askTimeout to 30", () => {
    expect(defaults.permissions.askTimeout).toBe(30);
  });

  it("defaults rulesFile to CLAUDE.md", () => {
    expect(defaults.rulesFile).toBe("CLAUDE.md");
  });

  it("does not contain extra keys beyond known Config shape", () => {
    const knownKeys: (keyof Config)[] = [
      "apiKey",
      "model",
      "baseUrl",
      "maxTurns",
      "fallbackModel",
      "fallbackBaseUrl",
      "permissions",
      "rulesFile",
    ];
    const actualKeys = Object.keys(defaults) as (keyof Config)[];
    for (const key of actualKeys) {
      expect(knownKeys).toContain(key);
    }
    expect(actualKeys.length).toBe(knownKeys.length);
  });

  it("type-checks: apiKey is string, maxTurns is integer", () => {
    expect(typeof defaults.apiKey).toBe("string");
    expect(typeof defaults.model).toBe("string");
    expect(typeof defaults.maxTurns).toBe("number");
    expect(Number.isInteger(defaults.maxTurns)).toBe(true);
    expect(typeof defaults.permissions.askTimeout).toBe("number");
    expect(Number.isInteger(defaults.permissions.askTimeout)).toBe(true);
    expect(Array.isArray(defaults.permissions.autoApprove)).toBe(true);
    expect(Array.isArray(defaults.permissions.deny)).toBe(true);
  });
});
