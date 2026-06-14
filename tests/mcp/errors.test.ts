import { describe, expect, it } from "vitest";
import {
  createSafeMcpError,
  redactMcpSecrets,
  truncateMcpResult,
} from "../../src/mcp/errors";

describe("MCP safe errors", () => {
  it("creates user-safe connection error summaries", () => {
    const error = createSafeMcpError("CONNECTION_FAILED", new Error("spawn ENOENT /usr/bin/missing"));

    expect(error).toEqual({
      code: "CONNECTION_FAILED",
      message: "Connection failed",
      detail: "spawn ENOENT /usr/bin/missing",
    });
  });

  it("redacts env and header secret-like values", () => {
    const text = "Authorization: Bearer abc123\napi_key=sk-secret\nTOKEN=my-token\nnormal=value";

    const redacted = redactMcpSecrets(text);

    expect(redacted).toContain("Authorization: [REDACTED]");
    expect(redacted).toContain("api_key=[REDACTED]");
    expect(redacted).toContain("TOKEN=[REDACTED]");
    expect(redacted).toContain("normal=value");
    expect(redacted).not.toContain("sk-secret");
    expect(redacted).not.toContain("my-token");
  });

  it("normalizes tool timeout and malformed output errors", () => {
    const timeout = createSafeMcpError("TOOL_TIMEOUT", "timed out after 30000ms");
    const malformed = createSafeMcpError("MALFORMED_OUTPUT", { reason: "not-json" });

    expect(timeout.message).toBe("Tool timed out");
    expect(timeout.detail).toBe("timed out after 30000ms");
    expect(malformed.message).toBe("Malformed tool output");
    expect(malformed.detail).toBe("{\"reason\":\"not-json\"}");
  });

  it("truncates oversized results with an explicit marker", () => {
    const result = truncateMcpResult("abcdef", 4);

    expect(result).toBe("abcd\n[truncated: MCP result exceeded 4 characters]");
  });

  it("does not leak secrets in returned error text", () => {
    const error = createSafeMcpError("CONNECTION_FAILED", "Authorization: Bearer secret-token api_key=sk-secret");

    expect(error.detail).toContain("[REDACTED]");
    expect(error.detail).not.toContain("secret-token");
    expect(error.detail).not.toContain("sk-secret");
  });
});
