import { describe, expect, it } from "vitest";
import { createScheduler } from "../../src/scheduling/scheduler";
import { createToolRegistry, registerTool } from "../../src/tools/registry";
import { z } from "zod";
import type { PermissionSystem, ToolCall, ToolResult } from "../../src/scheduling/types";
import type { ToolContext } from "../../src/tools/types";

const alwaysAllow: PermissionSystem = {
  checkPermission: () => ({ allowed: true }),
};

const schema = z.object({});

function toolWithResult(output: string) {
  return async (_args: Record<string, unknown>, _ctx: ToolContext) => {
    return { output };
  };
}

describe("scheduler", () => {
  it("dispatches calls through partition → execute and returns ordered results", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "Read", toolWithResult("r"), schema, true);
    registerTool(registry, "Write", toolWithResult("w"), schema, false);

    const scheduler = createScheduler(registry, alwaysAllow);
    const calls: ToolCall[] = [
      { name: "Read", args: {}, id: 1 },
      { name: "Write", args: {}, id: 2 },
    ];
    const results = await scheduler.dispatchTools(calls);

    expect(results).toHaveLength(2);
    expect(results[0].output).toBe("r");
    expect(results[1].output).toBe("w");
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });

  it("executes only first 8 tools when batch exceeds limit", async () => {
    const registry = createToolRegistry();
    for (let i = 1; i <= 12; i++) {
      registerTool(registry, `Tool${i}`, toolWithResult(`ok${i}`), schema, true);
    }

    const scheduler = createScheduler(registry, alwaysAllow);
    const calls: ToolCall[] = Array.from({ length: 12 }, (_, i) => ({
      name: `Tool${i + 1}`,
      args: {},
      id: i + 1,
    }));
    const results = await scheduler.dispatchTools(calls);

    expect(results).toHaveLength(12);
    // First 8 should succeed
    for (let i = 0; i < 8; i++) {
      expect(results[i].success).toBe(true);
      expect(results[i].id).toBe(i + 1);
    }
    // Last 4 should be skipped
    for (let i = 8; i < 12; i++) {
      expect(results[i].success).toBe(false);
      expect(results[i].error).toContain("Skipped");
    }
  });

  it("preserves declaration order in results", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "C", toolWithResult("c"), schema, true);
    registerTool(registry, "A", toolWithResult("a"), schema, true);
    registerTool(registry, "B", toolWithResult("b"), schema, true);

    const scheduler = createScheduler(registry, alwaysAllow);
    const calls: ToolCall[] = [
      { name: "C", args: {}, id: 3 },
      { name: "A", args: {}, id: 1 },
      { name: "B", args: {}, id: 2 },
    ];
    const results = await scheduler.dispatchTools(calls);

    expect(results.map((r) => r.output)).toEqual(["c", "a", "b"]);
  });
});
