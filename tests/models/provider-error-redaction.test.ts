import { describe, expect, it } from "vitest";
import { redactProviderError } from "../../src/observability/verbose";

describe("redactProviderError", () => {
  // T015: redaction for api_key patterns
  it("redacts api_key query parameter", () => {
    const input = "Request failed: https://api.example.test/v1/chat/completions?api_key=sk-or-v1-secret123";
    const result = redactProviderError(input);
    expect(result).not.toContain("sk-or-v1-secret123");
    expect(result).toContain("****");
  });

  it("redacts apikey in error body", () => {
    const input = '{"error":{"message":"Invalid apikey=sk-abc123xyz"}}';
    const result = redactProviderError(input);
    expect(result).not.toContain("sk-abc123xyz");
    expect(result).toContain("****");
  });

  it("redacts Bearer token in error text", () => {
    const input = "Got error: Authorization: Bearer sk-or-v1-mysecretkey12345";
    const result = redactProviderError(input);
    expect(result).not.toContain("sk-or-v1-mysecretkey12345");
    expect(result).toContain("****");
  });

  it("redacts Authorization header in verbose dump", () => {
    const input = `HTTP 401 Unauthorized
Authorization: Bearer sk-or-v1-deadbeef9999
X-Request-Id: abc123`;
    const result = redactProviderError(input);
    expect(result).not.toContain("sk-or-v1-deadbeef9999");
    expect(result).toContain("****");
  });

  it("redacts X-API-Key header", () => {
    const input = "X-API-Key: sk-myapikey123456";
    const result = redactProviderError(input);
    expect(result).not.toContain("sk-myapikey123456");
    expect(result).toContain("****");
  });

  it("redacts OpenRouter-style sk-or-v1 keys", () => {
    const input = "Failed with key sk-or-v1-****";
    const result = redactProviderError(input);
    expect(result).not.toContain("6731154cb43599fb3f05106a3ddbf6961a98a846f73d54f5572787af00f995af");
    expect(result).toContain("sk-****");
  });

  it("redacts secret=value patterns in JSON", () => {
    const input = '{"secret":"my-secret-value","data":"ok"}';
    const result = redactProviderError(input);
    expect(result).not.toContain("my-secret-value");
    expect(result).toContain("****");
  });

  it("preserves non-secret content", () => {
    const input = "HTTP 500 Internal Server Error: upstream connect error";
    const result = redactProviderError(input);
    expect(result).toBe(input);
  });

  it("handles empty string", () => {
    expect(redactProviderError("")).toBe("");
  });
});
