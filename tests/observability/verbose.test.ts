import { describe, expect, it, vi } from "vitest";
import { createVerbosePrinter, redactSecrets } from "../../src/observability/verbose";

describe("verbose", () => {
  it("prints model:request to stderr with system prompt truncated", () => {
    const stderr = vi.fn();
    const printer = createVerbosePrinter({ write: stderr });

    printer.print({
      type: "model:request",
      model: "deepseek-v4-pro",
      estimatedInputTokens: 5000,
    });

    expect(stderr).toHaveBeenCalled();
    const output = stderr.mock.calls[0]![0];
    expect(output).toContain("[VERBOSE]");
    expect(output).toContain("model:request");
    expect(output).toContain("deepseek-v4-pro");
  });

  it("prints model:response to stderr", () => {
    const stderr = vi.fn();
    const printer = createVerbosePrinter({ write: stderr });

    printer.print({
      type: "model:response",
      model: "deepseek-v4-pro",
      inputTokens: 1000,
      outputTokens: 200,
      cost: 0.0006,
    });

    expect(stderr).toHaveBeenCalled();
    const output = stderr.mock.calls[0]![0];
    expect(output).toContain("[VERBOSE]");
    expect(output).toContain("model:response");
  });

  it("does not print for non-model events", () => {
    const stderr = vi.fn();
    const printer = createVerbosePrinter({ write: stderr });

    printer.print({ type: "turn:start", turnNumber: 1 });
    printer.print({ type: "tool:end", toolName: "Read", durationMs: 5, success: true });

    expect(stderr).not.toHaveBeenCalled();
  });

  it("is a no-op when verbose is disabled", () => {
    const stderr = vi.fn();
    const printer = createVerbosePrinter({ write: stderr, enabled: false });

    printer.print({
      type: "model:request",
      model: "deepseek-v4-pro",
      estimatedInputTokens: 1000,
    });

    expect(stderr).not.toHaveBeenCalled();
  });
});

describe("redactSecrets", () => {
  it("redacts sk-* API keys", () => {
    // standalone sk- key
    const input = "token: sk-abc123xyz456";
    expect(redactSecrets(input)).not.toContain("sk-abc123xyz456");
    expect(redactSecrets(input)).toContain("sk-****");
  });

  it("redacts api_key= values", () => {
    const input = "api_key=secret123";
    expect(redactSecrets(input)).not.toContain("secret123");
  });

  it("redacts Authorization header values", () => {
    const input = 'Authorization: Bearer token123\nContent-Type: application/json';
    const result = redactSecrets(input);
    expect(result).not.toContain("token123");
    expect(result).toContain("Authorization: ****");
  });

  it("returns unchanged string when no secrets present", () => {
    const input = "Hello, this is a normal message";
    expect(redactSecrets(input)).toBe(input);
  });
});
