import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { adaptMcpTool, adaptMcpTools } from "../../src/mcp/tool-adapter";
import type { McpManager } from "../../src/mcp/manager";
import type { McpToolDefinition } from "../../src/mcp/types";

function tool(overrides: Partial<McpToolDefinition> = {}): McpToolDefinition {
  return {
    serverName: "filesystem",
    toolName: "read-file",
    permissionKey: "mcp__filesystem__read_file",
    description: "Read a file",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    isAvailable: true,
    ...overrides,
  };
}

function manager(overrides: Partial<McpManager> = {}): McpManager {
  return {
    connectAll: vi.fn(async () => undefined),
    refreshTools: vi.fn(async () => undefined),
    listTools: vi.fn(() => []),
    getSession: vi.fn(() => undefined),
    getSessions: vi.fn(() => []),
    callTool: vi.fn(async () => ({ ok: true, content: [{ type: "text", text: "file content" }] })),
    close: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("MCP tool adapter", () => {
  it("converts MCP tool definitions into registered SuperAgent tools", () => {
    const registered = adaptMcpTool(tool(), manager());

    expect(registered.name).toBe("mcp__filesystem__read_file");
    expect(registered.concurrencySafe).toBe(false);
    expect(registered.schema).toBeInstanceOf(z.ZodType);
    expect(registered.schema.parse({ path: "README.md" })).toEqual({ path: "README.md" });
  });

  it("includes server and tool identity in the description", () => {
    const registered = adaptMcpTool(tool(), manager());

    expect(registered.description).toContain("filesystem");
    expect(registered.description).toContain("read-file");
    expect(registered.description).toContain("Read a file");
  });

  it("delegates execution to McpManager.callTool", async () => {
    const mcp = manager();
    const registered = adaptMcpTool(tool(), mcp);

    const result = await registered.fn({ path: "README.md" }, { workingDirectory: ".", sessionId: "s1" });

    expect(mcp.callTool).toHaveBeenCalledWith("filesystem", "read-file", { path: "README.md" });
    expect(result).toEqual({ output: "file content" });
  });

  it("normalizes failed MCP calls into safe tool results", async () => {
    const mcp = manager({
      callTool: vi.fn(async () => ({
        ok: false,
        error: { code: "CONNECTION_FAILED", message: "Connection failed", detail: "spawn ENOENT" },
      })),
    });
    const registered = adaptMcpTool(tool(), mcp);

    const result = await registered.fn({}, { workingDirectory: ".", sessionId: "s1" });

    expect(result.output).toBe("Connection failed");
    expect(result.error).toBe("spawn ENOENT");
    expect(result.metadata).toEqual({ code: "CONNECTION_FAILED" });
  });

  it("formats image and resource results without throwing", async () => {
    const mcp = manager({
      callTool: vi.fn(async () => ({
        ok: true,
        content: [
          { type: "image", data: "abc", mimeType: "image/png" },
          { type: "resource", resource: { uri: "file:///tmp/a.txt" } },
        ],
      })),
    });
    const registered = adaptMcpTool(tool(), mcp);

    const result = await registered.fn({}, { workingDirectory: ".", sessionId: "s1" });

    expect(result.output).toContain("[image: image/png, 3 bytes]");
    expect(result.output).toContain('"uri":"file:///tmp/a.txt"');
  });

  it("adapts only available tools", () => {
    const registered = adaptMcpTools([tool(), tool({ isAvailable: false, permissionKey: "mcp__filesystem__write_file" })], manager());

    expect(registered.map((entry) => entry.name)).toEqual(["mcp__filesystem__read_file"]);
  });
});
