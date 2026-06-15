import { z } from "zod";
import type { McpManager } from "./manager";
import { truncateMcpResult } from "./errors";
import type { McpContentBlock, McpToolDefinition } from "./types";
import type { LogEvent } from "../observability/types";
import type { RegisteredTool, ToolResult } from "../tools/types";

export interface McpToolAdapterOptions {
  emit?: (event: LogEvent) => void;
}

export function adaptMcpTool(
  tool: McpToolDefinition,
  manager: McpManager,
  options: McpToolAdapterOptions = {},
): RegisteredTool {
  return {
    name: tool.permissionKey,
    description: `MCP tool ${tool.serverName}/${tool.toolName}: ${tool.description}`,
    schema: z.record(z.unknown()),
    concurrencySafe: false,
    async fn(args): Promise<ToolResult> {
      options.emit?.({
        type: "mcp:tool_start",
        serverName: tool.serverName,
        toolName: tool.toolName,
        permissionKey: tool.permissionKey,
      });
      const startedAt = Date.now();
      const result = await manager.callTool(tool.serverName, tool.toolName, args);
      if (!result.ok) {
        options.emit?.({
          type: "mcp:tool_end",
          serverName: tool.serverName,
          toolName: tool.toolName,
          permissionKey: tool.permissionKey,
          durationMs: Date.now() - startedAt,
          success: false,
          error: result.error.detail ?? result.error.message,
        });
        return {
          output: result.error.message,
          error: result.error.detail,
          metadata: { code: result.error.code },
        };
      }

      options.emit?.({
        type: "mcp:tool_end",
        serverName: tool.serverName,
        toolName: tool.toolName,
        permissionKey: tool.permissionKey,
        durationMs: Date.now() - startedAt,
        success: true,
      });
      return {
        output: truncateMcpResult(result.content.map(formatContentBlock).join("\n")),
        metadata: result.metadata,
      };
    },
  };
}

export function adaptMcpTools(
  tools: McpToolDefinition[],
  manager: McpManager,
  options: McpToolAdapterOptions = {},
): RegisteredTool[] {
  return tools.filter((tool) => tool.isAvailable).map((tool) => adaptMcpTool(tool, manager, options));
}

function formatContentBlock(block: McpContentBlock): string {
  if (block.type === "text") return block.text;
  if (block.type === "image") return `[image: ${block.mimeType}, ${block.data.length} bytes]`;
  return JSON.stringify(block.resource);
}
