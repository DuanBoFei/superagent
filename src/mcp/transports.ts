import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { createSafeMcpError, redactMcpSecrets } from "./errors";
import type { McpSafeError, McpServerConfig } from "./types";

export type McpTransportBuildResult =
  | { ok: true; transport: Transport; diagnostic: string }
  | { ok: false; error: McpSafeError; diagnostic: string };

export function createMcpTransport(
  serverName: string,
  config: McpServerConfig,
): McpTransportBuildResult {
  const diagnostic = describeMcpTransportConfig(serverName, config);

  try {
    if (config.transport === "stdio") {
      if (!config.command.trim()) {
        throw new Error("stdio command is required");
      }

      return {
        ok: true,
        transport: new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: config.env,
          stderr: "pipe",
        }),
        diagnostic,
      };
    }

    const url = parseHttpUrl(config.url);
    return {
      ok: true,
      transport: new StreamableHTTPClientTransport(url, {
        requestInit: { headers: config.headers },
      }),
      diagnostic,
    };
  } catch (error) {
    return {
      ok: false,
      error: createSafeMcpError("CONNECTION_FAILED", error),
      diagnostic,
    };
  }
}

export function describeMcpTransportConfig(serverName: string, config: McpServerConfig): string {
  if (config.transport === "stdio") {
    const command = [config.command, ...config.args].filter(Boolean).join(" ");
    const env = Object.entries(config.env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    return redactMcpSecrets(
      `MCP server ${serverName} uses stdio transport: ${command}${env ? ` env\n${env}` : ""}`,
    );
  }

  const headers = Object.entries(config.headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  return redactMcpSecrets(
    `MCP server ${serverName} uses http transport: ${config.url}${headers ? ` headers\n${headers}` : ""}`,
  );
}

function parseHttpUrl(value: string): URL {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("valid http url is required");
    }
    return url;
  } catch {
    throw new Error("valid http url is required");
  }
}
