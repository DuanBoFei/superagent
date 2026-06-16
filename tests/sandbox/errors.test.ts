import { describe, expect, it } from "vitest";
import { normalizeSandboxError, safeSandboxOutput, truncateSandboxOutput } from "../../src/sandbox/errors";

describe("sandbox error handling", () => {
  it("redacts secret-like values from output", () => {
    expect(safeSandboxOutput("token=abc123 sk-secret-token api_key=hidden")).toBe("token=[REDACTED] [REDACTED] api_key=[REDACTED]");
  });

  it("truncates long output before context injection", () => {
    const output = truncateSandboxOutput("a".repeat(10), 4);
    expect(output).toBe("aaaa\n[truncated]");
  });

  it("normalizes failure diagnostics without leaking details", () => {
    expect(normalizeSandboxError("pull_failed", "api_key=secret missing image")).toBe(
      "Docker image pull failed: api_key=[REDACTED] missing image",
    );
  });
});
