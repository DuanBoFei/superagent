import { describe, expect, it } from "vitest";
import {
  buildMcpToolName,
  normalizeMcpNamePart,
  parseMcpToolName,
} from "../../src/mcp/tool-names";

describe("MCP tool names", () => {
  it("generates server-qualified tool names", () => {
    expect(buildMcpToolName("filesystem", "read_file")).toBe("mcp__filesystem__read_file");
  });

  it("normalizes server and tool names before building permission keys", () => {
    expect(buildMcpToolName("File System", "Read File")).toBe("mcp__file_system__read_file");
    expect(buildMcpToolName("Git.Server", "branch-list")).toBe("mcp__git_server__branch_list");
  });

  it("rejects empty or unsafe names", () => {
    expect(() => normalizeMcpNamePart("")).toThrow(/empty/i);
    expect(() => normalizeMcpNamePart("../secrets")).toThrow(/unsafe/i);
    expect(() => normalizeMcpNamePart("mcp__reserved")).toThrow(/unsafe/i);
    expect(() => normalizeMcpNamePart("read:file")).toThrow(/unsafe/i);
  });

  it("parses generated keys back to server and tool parts", () => {
    expect(parseMcpToolName("mcp__filesystem__read_file")).toEqual({
      serverName: "filesystem",
      toolName: "read_file",
    });
  });

  it("rejects malformed MCP keys", () => {
    expect(() => parseMcpToolName("Read")).toThrow(/mcp/i);
    expect(() => parseMcpToolName("mcp__server")).toThrow(/mcp/i);
    expect(() => parseMcpToolName("mcp____tool")).toThrow(/empty/i);
  });

  it("cannot collide with built-in tool names because of the mcp prefix", () => {
    expect(buildMcpToolName("Read", "Read")).toBe("mcp__read__read");
    expect(buildMcpToolName("Read", "Read")).not.toBe("Read");
  });
});
