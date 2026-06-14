import { z } from "zod";
import type { McpManager } from "./manager";
import { truncateMcpResult } from "./errors";
import type { McpContentBlock, McpToolDefinition } from "./types";
import type { RegisteredTool, ToolResult } from "../tools/types";

export function adaptMcpTool(tool: McpToolDefinition, manager: McpManager): RegisteredTool {
  return {
    name: tool.permissionKey,
    description: `MCP tool ${tool.serverName}/${tool.toolName}: ${tool.description}`,
    schema: z.record(z.unknown()),
    concurrencySafe: false,
    async fn(args): Promise<ToolResult> {
      const result = await manager.callTool(tool.serverName, tool.toolName, args);
      if (!result.ok) {
        return {
          output: result.error.message,
          error: result.error.detail,
          metadata: { code: result.error.code },
        };
      }

      return {
        output: truncateMcpResult(result.content.map(formatContentBlock).join("\n")),
        metadata: result.metadata,
      };
    },
  };
}

export function adaptMcpTools(tools: McpToolDefinition[], manager: McpManager): RegisteredTool[] {
  return tools.filter((tool) => tool.isAvailable).map((tool) => adaptMcpTool(tool, manager));
}

function formatContentBlock(block: McpContentBlock): string {
  if (block.type === "text") return block.text;
  if (block.type === "image") return `[image: ${block.mimeType}, ${block.data.length} bytes]`;
  return JSON.stringify(block.resource);
}
