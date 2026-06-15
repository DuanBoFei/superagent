import { describe, expect, it } from "vitest";
import {
  createSafeHookError,
  normalizeHookFailure,
  normalizeInvalidHookJson,
  redactHookSecrets,
  truncateHookOutput,
} from "../../src/hooks/errors";

describe("hook safe errors", () => {
  it("normalizes command not found errors", () => {
    expect(createSafeHookError("COMMAND_NOT_FOUND", new Error("spawn policy ENOENT"))).toEqual({
      code: "COMMAND_NOT_FOUND",
      message: "Hook command not found",
      detail: "spawn policy ENOENT",
    });
  });

  it("normalizes non-zero exit results", () => {
    expect(normalizeHookFailure({ exitCode: 2, stderr: "policy failed" })).toEqual({
      code: "NON_ZERO_EXIT",
      message: "Hook command exited with a non-zero status",
      detail: "exitCode=2 stderr=policy failed",
    });
  });

  it("normalizes timeout results", () => {
    expect(createSafeHookError("TIMEOUT", "timed out after 3000ms")).toEqual({
      code: "TIMEOUT",
      message: "Hook command timed out",
      detail: "timed out after 3000ms",
    });
  });

  it("normalizes invalid JSON output", () => {
    expect(normalizeInvalidHookJson("{not-json")).toEqual({
      code: "INVALID_JSON",
      message: "Hook returned invalid JSON",
      detail: "{not-json",
    });
  });

  it("truncates oversized stdout and stderr summaries", () => {
    expect(truncateHookOutput("abcdef", 4)).toBe("abcd\n[truncated: hook output exceeded 4 characters]");
    expect(truncateHookOutput("abc", 4)).toBe("abc");
  });

  it("redacts secret-like values", () => {
    const text = "Authorization: Bearer abc\napi_key=sk-test123 token=secret-token password=hunter2 sk-live456";

    expect(redactHookSecrets(text)).toBe(
      "Authorization: [REDACTED]\napi_key=[REDACTED] token=[REDACTED] password=[REDACTED] [REDACTED]",
    );
  });

  it("redacts secrets from normalized error details", () => {
    expect(createSafeHookError("INVALID_JSON", "api_key=sk-test123")).toEqual({
      code: "INVALID_JSON",
      message: "Hook returned invalid JSON",
      detail: "api_key=[REDACTED]",
    });
  });
});
