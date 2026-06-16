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

describe("sandbox config contract", () => {
  it("omitted sandbox defaults to disabled Docker config", () => {
    const { config, warnings } = validateConfig(validConfig());

    expect(warnings).toEqual([]);
    expect(config.sandbox).toEqual({
      enabled: false,
      type: "docker",
      image: undefined,
      workspaceMount: "/workspace",
      network: "none",
      envAllowlist: [],
      env: {},
      pullPolicy: "never",
      timeoutMs: 120000,
      memoryMb: undefined,
      cpus: undefined,
    });
  });

  it("disabled sandbox preserves config but does not require an image", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        sandbox: {
          enabled: false,
          type: "docker",
          workspaceMount: "/repo",
          network: "host",
          envAllowlist: ["PATH"],
          env: { NODE_ENV: "test" },
          pullPolicy: "missing",
          timeoutMs: 30000,
          memoryMb: 512,
          cpus: 1,
        },
      }),
    );

    expect(warnings).toEqual([]);
    expect(config.sandbox).toEqual({
      enabled: false,
      type: "docker",
      image: undefined,
      workspaceMount: "/repo",
      network: "host",
      envAllowlist: ["PATH"],
      env: { NODE_ENV: "test" },
      pullPolicy: "missing",
      timeoutMs: 30000,
      memoryMb: 512,
      cpus: 1,
    });
  });

  it("enabled sandbox without image fails validation and falls back to disabled default", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        sandbox: {
          enabled: true,
          type: "docker",
        },
      }),
    );

    expect(config.sandbox).toEqual(defaults.sandbox);
    expect(warnings.some((warning) => warning.includes("sandbox.image"))).toBe(true);
  });

  it("unknown sandbox type fails validation and falls back to disabled default", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        sandbox: {
          enabled: true,
          type: "firecracker",
          image: "superagent/sandbox:latest",
        },
      }),
    );

    expect(config.sandbox).toEqual(defaults.sandbox);
    expect(warnings.some((warning) => warning.includes("sandbox.type"))).toBe(true);
  });

  it("unknown network fails validation and falls back to disabled default", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        sandbox: {
          enabled: true,
          type: "docker",
          image: "superagent/sandbox:latest",
          network: "internet",
        },
      }),
    );

    expect(config.sandbox).toEqual(defaults.sandbox);
    expect(warnings.some((warning) => warning.includes("sandbox.network"))).toBe(true);
  });

  it("unknown pullPolicy fails validation and falls back to disabled default", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        sandbox: {
          enabled: true,
          type: "docker",
          image: "superagent/sandbox:latest",
          pullPolicy: "sometimes",
        },
      }),
    );

    expect(config.sandbox).toEqual(defaults.sandbox);
    expect(warnings.some((warning) => warning.includes("sandbox.pullPolicy"))).toBe(true);
  });

  it("invalid timeout fails validation and falls back to disabled default", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        sandbox: {
          enabled: true,
          type: "docker",
          image: "superagent/sandbox:latest",
          timeoutMs: 0,
        },
      }),
    );

    expect(config.sandbox).toEqual(defaults.sandbox);
    expect(warnings.some((warning) => warning.includes("sandbox.timeoutMs"))).toBe(true);
  });

  it("invalid workspace mount path fails validation and falls back to disabled default", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        sandbox: {
          enabled: true,
          type: "docker",
          image: "superagent/sandbox:latest",
          workspaceMount: "relative/path",
        },
      }),
    );

    expect(config.sandbox).toEqual(defaults.sandbox);
    expect(warnings.some((warning) => warning.includes("sandbox.workspaceMount"))).toBe(true);
  });

  it("secret-like env values are accepted but redacted in diagnostics", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        sandbox: {
          enabled: true,
          type: "docker",
          image: "superagent/sandbox:latest",
          env: {
            API_KEY: "sk-secret-token",
          },
        },
      }),
    );

    expect(warnings.join("\n")).not.toContain("sk-secret-token");
    expect(config.sandbox.env).toEqual({ API_KEY: "sk-secret-token" });
  });
});
