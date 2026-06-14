import { describe, expect, it, vi } from "vitest";
import { createChecker } from "../../src/permissions/checker";
import { matchPattern } from "../../src/permissions/matcher";
import type { PermissionsConfig, PromptFn } from "../../src/permissions/types";

function config(overrides: Partial<PermissionsConfig> = {}): PermissionsConfig {
  return {
    autoApprove: [],
    deny: [],
    askTimeout: 30000,
    ...overrides,
  };
}

describe("MCP permissions", () => {
  it("mcp__* matches all MCP tools", () => {
    expect(matchPattern("mcp__filesystem__read_file", {}, "mcp__*")).toBe(true);
    expect(matchPattern("mcp__git__status", {}, "mcp__*")).toBe(true);
    expect(matchPattern("Read", { file_path: "x.ts" }, "mcp__*")).toBe(false);
  });

  it("mcp__server__* matches all tools from one server", () => {
    expect(matchPattern("mcp__filesystem__read_file", {}, "mcp__filesystem__*")).toBe(true);
    expect(matchPattern("mcp__filesystem__write_file", {}, "mcp__filesystem__*")).toBe(true);
    expect(matchPattern("mcp__git__status", {}, "mcp__filesystem__*")).toBe(false);
  });

  it("mcp__server__tool matches one MCP tool", () => {
    expect(matchPattern("mcp__filesystem__read_file", {}, "mcp__filesystem__read_file")).toBe(true);
    expect(matchPattern("mcp__filesystem__write_file", {}, "mcp__filesystem__read_file")).toBe(false);
  });

  it("deny rules win over allow rules", async () => {
    const promptFn = vi.fn<PromptFn>();
    const checker = createChecker(
      config({
        autoApprove: ["mcp__filesystem__*"],
        deny: ["mcp__filesystem__delete_file"],
      }),
      promptFn,
    );

    await expect(checker.checkPermission("mcp__filesystem__delete_file", {})).resolves.toBe("denied");
    expect(promptFn).not.toHaveBeenCalled();
  });

  it("explicit allow returns approved", async () => {
    const promptFn = vi.fn<PromptFn>();
    const checker = createChecker(config({ autoApprove: ["mcp__filesystem__read_file"] }), promptFn);

    await expect(checker.checkPermission("mcp__filesystem__read_file", {})).resolves.toBe("approved");
    expect(promptFn).not.toHaveBeenCalled();
  });

  it("explicit ask returns prompt decision", async () => {
    const promptFn = vi.fn<PromptFn>().mockResolvedValue("approved");
    const checker = createChecker(config({ autoApprove: [], deny: [] }), promptFn);

    await expect(checker.checkPermission("mcp__filesystem__read_file", {})).resolves.toBe("approved");
    expect(promptFn).toHaveBeenCalledWith("mcp__filesystem__read_file", "");
  });

  it("no matching MCP rule defaults to ask", async () => {
    const promptFn = vi.fn<PromptFn>().mockResolvedValue("denied");
    const checker = createChecker(config(), promptFn);

    await expect(checker.checkPermission("mcp__filesystem__read_file", {})).resolves.toBe("denied");
    expect(promptFn).toHaveBeenCalledTimes(1);
  });
});
