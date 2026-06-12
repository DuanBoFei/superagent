import { describe, expect, it } from "vitest";
import { parseEnvVars } from "../../src/config/env-parser";

describe("parseEnvVars", () => {
  it("extracts SUPERAGENT_MODEL as flat key", () => {
    expect(parseEnvVars({ SUPERAGENT_MODEL: "test" })).toEqual({
      model: "test",
    });
  });

  it("coerces numeric strings to integers", () => {
    expect(parseEnvVars({ SUPERAGENT_MAX_TURNS: "100" })).toEqual({
      maxTurns: 100,
    });
  });

  it("coerces boolean strings", () => {
    expect(parseEnvVars({ SUPERAGENT_VERBOSE: "true" })).toEqual({
      verbose: true,
    });
  });

  it("parses JSON array values", () => {
    const result = parseEnvVars({
      SUPERAGENT_PERMISSIONS_AUTOAPPROVE: '["Read"]',
    });
    expect(result).toEqual({ permissions: { autoApprove: ["Read"] } });
  });

  it("skips empty string values", () => {
    expect(parseEnvVars({ SUPERAGENT_API_KEY: "" })).toEqual({});
  });

  it("returns empty object when no SUPERAGENT_ vars", () => {
    expect(parseEnvVars({ PATH: "/usr/bin", HOME: "/home/user" })).toEqual({});
  });

  it("ignores non-SUPERAGENT_ prefixed vars", () => {
    const result = parseEnvVars({
      PATH: "/usr/bin",
      SUPERAGENT_MODEL: "pro",
    });
    expect(result).toEqual({ model: "pro" });
  });
});
