import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import { configSchema } from "../../src/config/validator";

function schemaShape(): Record<string, string> {
  const shape: Record<string, string> = {};
  const def = configSchema._def as { shape: Record<string, z.ZodType> };
  for (const key of Object.keys(def.shape)) {
    const field = def.shape[key];
    shape[key] = (field._def as { type: string }).type;
    if (shape[key] === "object") {
      // include nested keys for object fields
      const nested = (field._def as { shape: Record<string, z.ZodType> }).shape;
      for (const nk of Object.keys(nested)) {
        shape[`${key}.${nk}`] = (nested[nk]._def as { type: string }).type;
      }
    }
  }
  return shape;
}

describe("Config schema contract", () => {
  it("has all required top-level fields", () => {
    const shape = schemaShape();
    expect(Object.keys(shape).sort()).toEqual([
      "apiKey",
      "baseUrl",
      "browser",
      "fallbackBaseUrl",
      "fallbackModel",
      "hooks",
      "maxTurns",
      "mcpServers",
      "model",
      "permissions",
      "permissions.askTimeout",
      "permissions.autoApprove",
      "permissions.deny",
      "rulesFile",
      "sandbox",
    ]);
  });

  it("field type map matches snapshot", () => {
    const shape = schemaShape();
    expect(shape).toMatchSnapshot();
  });

  it("rejects empty config", () => {
    const result = configSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects apiKey as empty string", () => {
    const result = configSchema.safeParse({
      apiKey: "",
      model: "test",
      baseUrl: "https://example.com",
      maxTurns: 50,
      fallbackModel: "test",
      fallbackBaseUrl: "https://example.com",
      permissions: { autoApprove: [], deny: [], askTimeout: 30 },
      rulesFile: "CLAUDE.md",
    });
    expect(result.success).toBe(false);
  });

  it("rejects baseUrl that is not a valid URL", () => {
    const result = configSchema.safeParse({
      apiKey: "sk-test",
      model: "test",
      baseUrl: "not-a-url",
      maxTurns: 50,
      fallbackModel: "test",
      fallbackBaseUrl: "https://example.com",
      permissions: { autoApprove: [], deny: [], askTimeout: 30 },
      rulesFile: "CLAUDE.md",
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxTurns below 1", () => {
    const result = configSchema.safeParse({
      apiKey: "sk-test",
      model: "test",
      baseUrl: "https://example.com",
      maxTurns: 0,
      fallbackModel: "test",
      fallbackBaseUrl: "https://example.com",
      permissions: { autoApprove: [], deny: [], askTimeout: 30 },
      rulesFile: "CLAUDE.md",
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxTurns above 500", () => {
    const result = configSchema.safeParse({
      apiKey: "sk-test",
      model: "test",
      baseUrl: "https://example.com",
      maxTurns: 501,
      fallbackModel: "test",
      fallbackBaseUrl: "https://example.com",
      permissions: { autoApprove: [], deny: [], askTimeout: 30 },
      rulesFile: "CLAUDE.md",
    });
    expect(result.success).toBe(false);
  });

  it("rejects askTimeout below 5", () => {
    const result = configSchema.safeParse({
      apiKey: "sk-test",
      model: "test",
      baseUrl: "https://example.com",
      maxTurns: 50,
      fallbackModel: "test",
      fallbackBaseUrl: "https://example.com",
      permissions: { autoApprove: [], deny: [], askTimeout: 4 },
      rulesFile: "CLAUDE.md",
    });
    expect(result.success).toBe(false);
  });

  it("rejects askTimeout above 300", () => {
    const result = configSchema.safeParse({
      apiKey: "sk-test",
      model: "test",
      baseUrl: "https://example.com",
      maxTurns: 50,
      fallbackModel: "test",
      fallbackBaseUrl: "https://example.com",
      permissions: { autoApprove: [], deny: [], askTimeout: 301 },
      rulesFile: "CLAUDE.md",
    });
    expect(result.success).toBe(false);
  });

  it("rejects askTimeout as non-integer", () => {
    const result = configSchema.safeParse({
      apiKey: "sk-test",
      model: "test",
      baseUrl: "https://example.com",
      maxTurns: 50,
      fallbackModel: "test",
      fallbackBaseUrl: "https://example.com",
      permissions: { autoApprove: [], deny: [], askTimeout: 30.5 },
      rulesFile: "CLAUDE.md",
    });
    expect(result.success).toBe(false);
  });

  it("accepts minimally valid config", () => {
    const result = configSchema.safeParse({
      apiKey: "sk-test",
      model: "deepseek-v4-pro",
      baseUrl: "https://api.deepseek.com",
      maxTurns: 50,
      fallbackModel: "deepseek-v4-flash",
      fallbackBaseUrl: "https://api.deepseek.com",
      permissions: {
        autoApprove: ["Read"],
        deny: ["Bash:rm *"],
        askTimeout: 30,
      },
      rulesFile: "CLAUDE.md",
    });
    expect(result.success).toBe(true);
  });

  it("accepts config at maxTurns boundary (500)", () => {
    const result = configSchema.safeParse({
      apiKey: "sk-test",
      model: "test",
      baseUrl: "https://example.com",
      maxTurns: 500,
      fallbackModel: "test",
      fallbackBaseUrl: "https://example.com",
      permissions: { autoApprove: [], deny: [], askTimeout: 30 },
      rulesFile: "CLAUDE.md",
    });
    expect(result.success).toBe(true);
  });

  it("accepts config at askTimeout boundaries (5 and 300)", () => {
    const r1 = configSchema.safeParse({
      apiKey: "sk-test",
      model: "test",
      baseUrl: "https://example.com",
      maxTurns: 50,
      fallbackModel: "test",
      fallbackBaseUrl: "https://example.com",
      permissions: { autoApprove: [], deny: [], askTimeout: 5 },
      rulesFile: "CLAUDE.md",
    });
    expect(r1.success).toBe(true);

    const r2 = configSchema.safeParse({
      apiKey: "sk-test",
      model: "test",
      baseUrl: "https://example.com",
      maxTurns: 50,
      fallbackModel: "test",
      fallbackBaseUrl: "https://example.com",
      permissions: { autoApprove: [], deny: [], askTimeout: 300 },
      rulesFile: "CLAUDE.md",
    });
    expect(r2.success).toBe(true);
  });
});
