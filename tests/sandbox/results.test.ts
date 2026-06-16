import { describe, expect, it } from "vitest";
import { normalizeSandboxCommandResult, normalizeSandboxFailure } from "../../src/sandbox/results";

describe("sandbox result normalization", () => {
  it("normalizes docker command output into sandbox result", () => {
    expect(normalizeSandboxCommandResult({ stdout: "ok", stderr: "", exitCode: 0 }, 12)).toEqual({
      status: "completed",
      stdout: "ok",
      stderr: "",
      exitCode: 0,
      timedOut: false,
      durationMs: 12,
    });
  });

  it("normalizes setup failures with safe diagnostics", () => {
    expect(normalizeSandboxFailure("image_unavailable", "api_key=secret", 3)).toEqual({
      status: "setup_failed",
      stdout: "",
      stderr: "",
      exitCode: null,
      timedOut: false,
      durationMs: 3,
      safeError: "Docker image unavailable: api_key=[REDACTED]",
    });
  });

  it("normalizes timeout failures", () => {
    expect(normalizeSandboxFailure("timeout", "120000ms", 120000)).toMatchObject({
      status: "timed_out",
      timedOut: true,
    });
  });
});
