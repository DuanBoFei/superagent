import { describe, expect, it } from "vitest";
import { evaluatePolicy, type ErrorCategory, type FallbackContext } from "../../src/models/fallback-policy";

function ctx(overrides: Partial<FallbackContext> = {}): FallbackContext {
  return {
    category: "server_error",
    primaryAttempts: 0,
    maxPrimaryRetries: 1,
    fallbackAvailable: true,
    ...overrides,
  };
}

describe("evaluatePolicy", () => {
  // T001: timeout fallback decision
  describe("timeout errors", () => {
    it("falls back immediately without retry", () => {
      expect(evaluatePolicy(ctx({ category: "timeout" }))).toEqual({
        type: "fallback",
      });
    });

    it("fails when fallback is not available", () => {
      expect(
        evaluatePolicy(ctx({ category: "timeout", fallbackAvailable: false })),
      ).toEqual({
        type: "fail",
        reason: "Primary timed out and no fallback model available",
      });
    });
  });

  // T001: network error fallback decision
  describe("network errors", () => {
    it("falls back immediately without retry", () => {
      expect(evaluatePolicy(ctx({ category: "network_error" }))).toEqual({
        type: "fallback",
      });
    });

    it("fails when fallback is not available", () => {
      expect(
        evaluatePolicy(ctx({ category: "network_error", fallbackAvailable: false })),
      ).toEqual({
        type: "fail",
        reason: "Primary network error and no fallback model available",
      });
    });
  });

  // T002: 5xx primary retry then fallback
  describe("server errors (5xx)", () => {
    it("retries primary on first server error", () => {
      expect(
        evaluatePolicy(ctx({ category: "server_error", primaryAttempts: 0 })),
      ).toEqual({
        type: "retry",
        delayMs: 2000,
      });
    });

    it("falls back after primary retries exhausted", () => {
      expect(
        evaluatePolicy(ctx({ category: "server_error", primaryAttempts: 1 })),
      ).toEqual({
        type: "fallback",
      });
    });

    it("fails when retries exhausted and no fallback", () => {
      expect(
        evaluatePolicy(ctx({
          category: "server_error",
          primaryAttempts: 1,
          fallbackAvailable: false,
        })),
      ).toEqual({
        type: "fail",
        reason: "Primary server error retries exhausted and no fallback model available",
      });
    });
  });

  // T002: 429 rate limit retry then fallback
  describe("rate limit errors (429)", () => {
    it("retries primary on first rate limit", () => {
      expect(
        evaluatePolicy(ctx({ category: "rate_limit", primaryAttempts: 0 })),
      ).toEqual({
        type: "retry",
        delayMs: 0,
      });
    });

    it("falls back after primary rate limit retries exhausted", () => {
      expect(
        evaluatePolicy(ctx({ category: "rate_limit", primaryAttempts: 1 })),
      ).toEqual({
        type: "fallback",
      });
    });
  });

  // T003: 400/401/403 terminal errors
  describe("client errors (400, 404)", () => {
    it("fails immediately on client error", () => {
      expect(evaluatePolicy(ctx({ category: "client_error" }))).toEqual({
        type: "fail",
        reason: "Request error — not retrying",
      });
    });

    it("fails even with fallback available", () => {
      expect(
        evaluatePolicy(ctx({ category: "client_error", fallbackAvailable: true })),
      ).toEqual({
        type: "fail",
        reason: "Request error — not retrying",
      });
    });
  });

  describe("auth errors (401, 403)", () => {
    it("fails immediately on auth error", () => {
      expect(evaluatePolicy(ctx({ category: "auth_error" }))).toEqual({
        type: "fail",
        reason: "Authentication error — check API key",
      });
    });

    it("fails even with fallback available", () => {
      expect(
        evaluatePolicy(ctx({ category: "auth_error", fallbackAvailable: true })),
      ).toEqual({
        type: "fail",
        reason: "Authentication error — check API key",
      });
    });
  });

  // Edge cases
  it("defaults to fail for unknown categories", () => {
    expect(
      evaluatePolicy(ctx({ category: "client_error" as ErrorCategory })),
    ).toEqual({
      type: "fail",
      reason: "Request error — not retrying",
    });
  });
});
