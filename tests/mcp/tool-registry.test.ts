import { describe, expect, it, vi } from "vitest";
import type { McpManager } from "../../src/mcp/manager";
import { registerMcpTools } from "../../src/tools/registry";
import { registerAllTools } from "../../src/tools/index";
import { createToolRegistry, listTools } from "../../src/tools/registry";

function manager(tools: ReturnType<McpManager["listTools"]>): McpManager {
  return {
    connectAll: vi.fn(async () => undefined),
    refreshTools: vi.fn(async () => undefined),
    listTools: vi.fn(() => tools),
    getSession: vi.fn(() => undefined),
    getSessions: vi.fn(() => []),
    callTool: vi.fn(async () => ({ ok: true, content: [{ type: "text", text: "ok" }] })),
    close: vi.fn(async () => undefined),
  };
}

describe("MCP tool registry integration", () => {
  it("preserves built-in order and appends MCP tools deterministically", () => {
    const registry = createToolRegistry();
    registerAllTools(registry);
    registerMcpTools(
      registry,
      manager([
        {
          serverName: "git",
          toolName: "status",
          permissionKey: "mcp__git__status",
          description: "Git status",
          inputSchema: { type: "object" },
          isAvailable: true,
        },
        {
          serverName: "filesystem",
          toolName: "read-file",
          permissionKey: "mcp__filesystem__read_file",
          description: "Read file",
          inputSchema: { type: "object" },
          isAvailable: true,
        },
      ]),
    );

    expect(listTools(registry).map((tool) => tool.name)).toEqual([
      "Read",
      "Write",
      "Edit",
      "Bash",
      "Grep",
      "Glob",
      "Task",
      "WebSearch",
      "mcp__filesystem__read_file",
      "mcp__git__status",
    ]);
  });

  it("keeps duplicate raw tool names distinct across servers", () => {
    const registry = createToolRegistry();
    registerMcpTools(
      registry,
      manager([
        {
          serverName: "git",
          toolName: "status",
          permissionKey: "mcp__git__status",
          description: "Git status",
          inputSchema: { type: "object" },
          isAvailable: true,
        },
        {
          serverName: "docker",
          toolName: "status",
          permissionKey: "mcp__docker__status",
          description: "Docker status",
          inputSchema: { type: "object" },
          isAvailable: true,
        },
      ]),
    );

    expect(listTools(registry).map((tool) => tool.name)).toEqual([
      "mcp__docker__status",
      "mcp__git__status",
    ]);
  });

  it("excludes unavailable MCP tools", () => {
    const registry = createToolRegistry();
    registerMcpTools(
      registry,
      manager([
        {
          serverName: "filesystem",
          toolName: "read-file",
          permissionKey: "mcp__filesystem__read_file",
          description: "Read file",
          inputSchema: { type: "object" },
          isAvailable: true,
        },
        {
          serverName: "filesystem",
          toolName: "write-file",
          permissionKey: "mcp__filesystem__write_file",
          description: "Write file",
          inputSchema: { type: "object" },
          isAvailable: false,
        },
      ]),
    );

    expect(listTools(registry).map((tool) => tool.name)).toEqual(["mcp__filesystem__read_file"]);
  });
});
