import { describe, expect, it } from "vitest";
import { mergeConfigs } from "../../src/config/merger";
import { defaults } from "../../src/config/defaults";
import { validateConfig } from "../../src/config/validator";

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    ...defaults,
    apiKey: "sk-test",
    ...overrides,
  };
}

describe("MCP config contract", () => {
  it("omitted mcpServers starts with empty config", () => {
    const { config } = validateConfig(validConfig());

    expect(config.mcpServers).toEqual({});
  });

  it("disabled server is preserved but marked disabled", () => {
    const { config } = validateConfig(
      validConfig({
        mcpServers: {
          filesystem: {
            enabled: false,
            transport: "stdio",
            command: "npx",
            args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
          },
        },
      }),
    );

    expect(config.mcpServers.filesystem).toEqual({
      enabled: false,
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
      env: {},
    });
  });

  it("stdio server without command fails validation and is omitted", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        mcpServers: {
          broken: {
            transport: "stdio",
          },
        },
      }),
    );

    expect(config.mcpServers).toEqual({});
    expect(warnings.some((warning) => warning.includes("mcpServers.broken.command"))).toBe(true);
  });

  it("http server without url fails validation and is omitted", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        mcpServers: {
          remote: {
            transport: "http",
          },
        },
      }),
    );

    expect(config.mcpServers).toEqual({});
    expect(warnings.some((warning) => warning.includes("mcpServers.remote.url"))).toBe(true);
  });

  it("unknown transport fails validation and is omitted", () => {
    const { config, warnings } = validateConfig(
      validConfig({
        mcpServers: {
          invalid: {
            transport: "websocket",
            url: "https://example.invalid/mcp",
          },
        },
      }),
    );

    expect(config.mcpServers).toEqual({});
    expect(warnings.some((warning) => warning.includes("mcpServers.invalid.transport"))).toBe(true);
  });

  it("later config layer overrides duplicate server names", () => {
    const merged = mergeConfigs(
      {
        mcpServers: {
          tools: {
            transport: "stdio",
            command: "node",
            args: ["old-server.js"],
          },
        },
      },
      {
        mcpServers: {
          tools: {
            transport: "http",
            url: "https://example.invalid/mcp",
            headers: { Authorization: "Bearer ${TOKEN}" },
          },
        },
      },
    );

    expect(merged.mcpServers).toEqual({
      tools: {
        transport: "http",
        url: "https://example.invalid/mcp",
        headers: { Authorization: "Bearer ${TOKEN}" },
      },
    });
  });
});
