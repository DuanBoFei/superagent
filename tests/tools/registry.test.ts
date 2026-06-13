import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createToolRegistry,
  getTool,
  isConcurrencySafe,
  listTools,
  registerTool,
} from "../../src/tools/registry";
import type { ToolContext, ToolResult } from "../../src/tools/types";
import { registerAllTools } from "../../src/tools/index";

describe("tool registry", () => {
  it("registers, retrieves, and lists tools", async () => {
    const registry = createToolRegistry();
    const schema = z.object({ value: z.string() });

    registerTool(
      registry,
      "Echo",
      async (args, context): Promise<ToolResult> => ({
        output: `${context.sessionId}:${args.value}`,
      }),
      schema,
      true,
    );

    const tool = getTool(registry, "Echo");
    const context: ToolContext = {
      workingDirectory: process.cwd(),
      sessionId: "session-1",
    };

    await expect(tool?.fn({ value: "hello" }, context)).resolves.toEqual({
      output: "session-1:hello",
    });
    expect(listTools(registry).map((entry) => entry.name)).toEqual(["Echo"]);
    expect(isConcurrencySafe(registry, "Echo")).toBe(true);
  });

  it("returns undefined for unknown tools and false concurrency", () => {
    const registry = createToolRegistry();

    expect(getTool(registry, "Missing")).toBeUndefined();
    expect(isConcurrencySafe(registry, "Missing")).toBe(false);
  });
});

describe("all-tools integration", () => {
  it("registers all 8 tools", () => {
    const registry = createToolRegistry();
    registerAllTools(registry);

    const tools = listTools(registry);
    expect(tools.length).toBe(8);

    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "Bash",
      "Edit",
      "Glob",
      "Grep",
      "Read",
      "Task",
      "WebSearch",
      "Write",
    ]);
  });

  it("marks read-only tools as concurrency-safe and write tools as serial", () => {
    const registry = createToolRegistry();
    registerAllTools(registry);

    expect(isConcurrencySafe(registry, "Read")).toBe(true);
    expect(isConcurrencySafe(registry, "Grep")).toBe(true);
    expect(isConcurrencySafe(registry, "Glob")).toBe(true);
    expect(isConcurrencySafe(registry, "Task")).toBe(true);
    expect(isConcurrencySafe(registry, "WebSearch")).toBe(true);

    expect(isConcurrencySafe(registry, "Write")).toBe(false);
    expect(isConcurrencySafe(registry, "Edit")).toBe(false);
    expect(isConcurrencySafe(registry, "Bash")).toBe(false);
  });

  it("each tool returns a valid ToolResult (no throws)", async () => {
    const registry = createToolRegistry();
    registerAllTools(registry);
    const context: ToolContext = {
      workingDirectory: process.cwd(),
      sessionId: "test",
    };

    for (const tool of listTools(registry)) {
      // Call each tool with minimal safe args to verify they run without throwing
      const args = minimalArgs(tool.name);
      const result = await tool.fn(args, context);
      expect(result).toHaveProperty("output");
    }
  });
});

function minimalArgs(name: string): Record<string, unknown> {
  switch (name) {
    case "Read":
      // File likely doesn't exist → error result, not throw
      return { file_path: "__nonexistent_integration_test__.tmp" };
    case "Write":
      // Missing parent dir → safe early error, not throw
      return { file_path: "__nonexistent_dir__/out.txt", content: "x" };
    case "Edit":
      // Missing file → safe error, not throw
      return { file_path: "__nonexistent_integration_test__.tmp", old_string: "x", new_string: "y" };
    case "Bash":
      return { command: "echo ok" };
    case "Grep":
      return { pattern: "test" };
    case "Glob":
      return { pattern: "*.ts" };
    case "Task":
      return { subject: "test", description: "desc" };
    case "WebSearch":
      return { query: "test" };
    default:
      return {};
  }
}
