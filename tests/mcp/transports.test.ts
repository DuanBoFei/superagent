import { describe, expect, it } from "vitest";
import { createMcpTransport, describeMcpTransportConfig } from "../../src/mcp/transports";
import type { McpHttpServerConfig, McpStdioServerConfig } from "../../src/mcp/types";

function stdioConfig(overrides: Partial<McpStdioServerConfig> = {}): McpStdioServerConfig {
  return {
    enabled: true,
    transport: "stdio",
    command: "node",
    args: ["server.js"],
    env: { API_KEY: "sk-secret", NORMAL: "value" },
    ...overrides,
  };
}

function httpConfig(overrides: Partial<McpHttpServerConfig> = {}): McpHttpServerConfig {
  return {
    enabled: true,
    transport: "http",
    url: "https://example.invalid/mcp",
    headers: { Authorization: "Bearer secret-token", "X-Trace": "trace-id" },
    ...overrides,
  };
}

describe("MCP transport builders", () => {
  it("builds stdio transports from command, args, and env configs", () => {
    const result = createMcpTransport("filesystem", stdioConfig());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful transport");
    expect(result.transport.constructor.name).toBe("StdioClientTransport");
    expect(result.diagnostic).toContain("filesystem");
    expect(result.diagnostic).toContain("stdio");
    expect(result.diagnostic).toContain("node server.js");
  });

  it("builds Streamable HTTP transports from url and headers configs", () => {
    const result = createMcpTransport("remote-tools", httpConfig());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful transport");
    expect(result.transport.constructor.name).toBe("StreamableHTTPClientTransport");
    expect(result.diagnostic).toContain("remote-tools");
    expect(result.diagnostic).toContain("http");
    expect(result.diagnostic).toContain("https://example.invalid/mcp");
  });

  it("returns safe validation errors for malformed stdio configs", () => {
    const result = createMcpTransport("broken", stdioConfig({ command: "" }));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed transport");
    expect(result.error.code).toBe("CONNECTION_FAILED");
    expect(result.error.message).toBe("Connection failed");
    expect(result.error.detail).toContain("stdio command is required");
  });

  it("returns safe validation errors for malformed http configs", () => {
    const result = createMcpTransport("broken", httpConfig({ url: "not-a-url" }));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed transport");
    expect(result.error.code).toBe("CONNECTION_FAILED");
    expect(result.error.detail).toContain("valid http url is required");
  });

  it("redacts secret-like env and header values in diagnostics", () => {
    const stdioDiagnostic = describeMcpTransportConfig("filesystem", stdioConfig());
    const httpDiagnostic = describeMcpTransportConfig("remote-tools", httpConfig());

    expect(stdioDiagnostic).toContain("API_KEY=[REDACTED]");
    expect(stdioDiagnostic).toContain("NORMAL=value");
    expect(stdioDiagnostic).not.toContain("sk-secret");
    expect(httpDiagnostic).toContain("Authorization: [REDACTED]");
    expect(httpDiagnostic).toContain("X-Trace: trace-id");
    expect(httpDiagnostic).not.toContain("secret-token");
  });
});
