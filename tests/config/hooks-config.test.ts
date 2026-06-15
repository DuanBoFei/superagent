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

describe("hooks config contract", () => {
  it("omitted hooks starts with empty config", () => {
    const { config } = validateConfig(validConfig());

    expect(config.hooks).toEqual({});
  });

  it("unknown event name fails validation and is omitted", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        hooks: {
          UnknownEvent: [
            {
              name: "unknown",
              enabled: true,
              command: "node",
            },
          ],
        },
      }),
    );

    expect(config.hooks).toEqual({});
    expect(warnings.some((warning) => warning.includes("hooks.UnknownEvent"))).toBe(true);
  });

  it("enabled hook without command fails validation and is omitted", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        hooks: {
          SessionStart: [
            {
              name: "broken-session-start",
              enabled: true,
            },
          ],
        },
      }),
    );

    expect(config.hooks.SessionStart).toEqual([]);
    expect(warnings.some((warning) => warning.includes("hooks.SessionStart.0.command"))).toBe(true);
  });

  it("disabled hook without command is allowed but not executable", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        hooks: {
          SessionStart: [
            {
              name: "disabled-session-start",
              enabled: false,
            },
          ],
        },
      }),
    );

    expect(warnings).toEqual([]);
    expect(config.hooks.SessionStart).toEqual([
      {
        name: "disabled-session-start",
        enabled: false,
        args: [],
        env: {},
        timeoutMs: 3000,
      },
    ]);
  });

  it("timeoutMs less than or equal to zero fails validation and is omitted", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        hooks: {
          SessionStart: [
            {
              name: "bad-timeout",
              enabled: true,
              command: "node",
              timeoutMs: 0,
            },
          ],
        },
      }),
    );

    expect(config.hooks.SessionStart).toEqual([]);
    expect(warnings.some((warning) => warning.includes("hooks.SessionStart.0.timeoutMs"))).toBe(true);
  });

  it("blocking true on observe-only event fails validation and is omitted", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        hooks: {
          PostToolUse: [
            {
              name: "invalid-blocking-post-tool",
              enabled: true,
              command: "node",
              blocking: true,
            },
          ],
        },
      }),
    );

    expect(config.hooks.PostToolUse).toEqual([]);
    expect(warnings.some((warning) => warning.includes("hooks.PostToolUse.0.blocking"))).toBe(true);
  });

  it("multiple hooks on one event preserve array order", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        hooks: {
          UserPromptSubmit: [
            {
              name: "first-policy",
              enabled: true,
              command: "node",
              args: ["first.js"],
              blocking: true,
            },
            {
              name: "second-policy",
              enabled: true,
              command: "node",
              args: ["second.js"],
              blocking: true,
            },
          ],
        },
      }),
    );

    expect(warnings).toEqual([]);
    expect(config.hooks.UserPromptSubmit.map((hook) => hook.name)).toEqual([
      "first-policy",
      "second-policy",
    ]);
  });
});
