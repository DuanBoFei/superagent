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
