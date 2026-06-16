import { describe, expect, it } from "vitest";
import { normalizeBrowserResult, safeBrowserText } from "../../src/browser/results";

const longText = "a".repeat(12001);

describe("browser result normalization", () => {
  it("normalizes successful page state", () => {
    expect(normalizeBrowserResult({
      action: "open",
      pageState: {
        finalUrl: "https://example.test/final",
        title: "Example",
        visibleText: "Hello world",
      },
      durationMs: 25,
    })).toEqual({
      action: "open",
      status: "running",
      finalUrl: "https://example.test/final",
      title: "Example",
      textSummary: "Hello world",
      artifacts: [],
      timedOut: false,
      durationMs: 25,
    });
  });

  it("normalizes setup failures", () => {
    expect(normalizeBrowserResult({
      action: "open",
      failure: { reason: "setup_failed", detail: "profile setup failed" },
      durationMs: 10,
    })).toMatchObject({
      action: "open",
      status: "failed",
      safeError: "Browser setup failed: profile setup failed",
    });
  });

  it("normalizes navigation failures", () => {
    expect(normalizeBrowserResult({
      action: "open",
      failure: { reason: "navigation_failed", detail: "net::ERR_FAILED" },
      durationMs: 10,
    })).toMatchObject({
      status: "failed",
      safeError: "Browser navigation failed: net::ERR_FAILED",
    });
  });

  it("normalizes action failures", () => {
    expect(normalizeBrowserResult({
      action: "click",
      failure: { reason: "action_failed", detail: "selector not found" },
      durationMs: 10,
    })).toMatchObject({
      status: "failed",
      safeError: "Browser action failed: selector not found",
    });
  });

  it("normalizes timeout results", () => {
    expect(normalizeBrowserResult({
      action: "wait",
      failure: { reason: "timeout", detail: "waiting for selector" },
      timedOut: true,
      durationMs: 30000,
    })).toMatchObject({
      status: "timed_out",
      timedOut: true,
      safeError: "Browser action timed out: waiting for selector",
    });
  });

  it("truncates oversized visible text and action trace", () => {
    const result = normalizeBrowserResult({
      action: "click",
      pageState: {
        visibleText: longText,
        actionTrace: longText,
      },
      durationMs: 10,
    });

    expect(result.textSummary).toHaveLength(12012);
    expect(result.textSummary).toContain("[truncated]");
    expect(result.actionTrace).toHaveLength(12012);
    expect(result.actionTrace).toContain("[truncated]");
  });

  it("redacts secret-like values", () => {
    const result = normalizeBrowserResult({
      action: "type",
      pageState: {
        visibleText: "token=sk-secret-token",
        actionTrace: "typed api_key=secret-value",
      },
      failure: { reason: "action_failed", detail: "token=sk-secret-token" },
      durationMs: 10,
    });

    expect(result.textSummary).not.toContain("sk-secret-token");
    expect(result.actionTrace).not.toContain("secret-value");
    expect(result.safeError).not.toContain("sk-secret-token");
    expect(result.textSummary).toContain("[REDACTED]");
  });

  it("redacts before truncating", () => {
    expect(safeBrowserText(`sk-secret-token ${longText}`)).not.toContain("sk-secret-token");
  });
});
