import { describe, expect, it } from "vitest";
import { executeBatch } from "../../src/scheduling/executor";
import { createToolRegistry, registerTool } from "../../src/tools/registry";
import { z } from "zod";
import type { BatchPlan, ToolCall, ToolResult, PermissionSystem } from "../../src/scheduling/types";
import type { ToolContext } from "../../src/tools/types";

const alwaysAllow: PermissionSystem = {
  checkPermission: async () => "approved",
};

function toolWithDelay(ms: number, output: string) {
  return async (_args: Record<string, unknown>, _ctx: ToolContext) => {
    await new Promise((r) => setTimeout(r, ms));
    return { output };
  };
}

function failingTool(msg: string) {
  return async () => ({ output: "", error: msg });
}

function throwingTool(msg: string) {
  return async () => {
    throw new Error(msg);
  };
}

const schema = z.object({});

function buildPlan(...ids: number[]): BatchPlan {
  const calls: ToolCall[] = ids.map((id) => ({ name: `Tool${id}`, args: {}, id }));
  return { concurrent: calls, serial: [] };
}

function buildSerialPlan(...ids: number[]): BatchPlan {
  const calls: ToolCall[] = ids.map((id) => ({ name: `Tool${id}`, args: {}, id }));
  return { concurrent: [], serial: calls };
}

describe("executor", () => {
  it("executes concurrent tools faster than sequential would", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "A", toolWithDelay(100, "a"), schema, true);
    registerTool(registry, "B", toolWithDelay(100, "b"), schema, true);
    registerTool(registry, "C", toolWithDelay(100, "c"), schema, true);

    const plan: BatchPlan = {
      concurrent: [
        { name: "A", args: {}, id: 1 },
        { name: "B", args: {}, id: 2 },
        { name: "C", args: {}, id: 3 },
      ],
      serial: [],
    };

    const start = Date.now();
    const results = await executeBatch(plan, registry, alwaysAllow);
    const elapsed = Date.now() - start;

    // If truly concurrent: ~100ms. If sequential: ~300ms.
    // Allow generous margin for CI variance.
    expect(elapsed).toBeLessThan(250);
    expect(results.map((r) => r.output)).toEqual(["a", "b", "c"]);
  });

  it("stops serial group on first failure", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "A", failingTool("fail-A"), schema, false);
    registerTool(registry, "B", failingTool("should not run"), schema, false);

    const plan: BatchPlan = {
      concurrent: [],
      serial: [
        { name: "A", args: {}, id: 1 },
        { name: "B", args: {}, id: 2 },
      ],
    };

    const results = await executeBatch(plan, registry, alwaysAllow);
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe("fail-A");
    expect(results[1].success).toBe(false);
    expect(results[1].error).toContain("Skipped");
  });

  it("returns results in declaration order regardless of execution order", async () => {
    const registry = createToolRegistry();
    // Slow first, fast second — if order not preserved, fast would appear first
    registerTool(registry, "Slow", toolWithDelay(100, "slow"), schema, true);
    registerTool(registry, "Fast", toolWithDelay(10, "fast"), schema, true);

    const plan: BatchPlan = {
      concurrent: [
        { name: "Slow", args: {}, id: 1 },
        { name: "Fast", args: {}, id: 2 },
      ],
      serial: [],
    };

    const results = await executeBatch(plan, registry, alwaysAllow);
    expect(results.map((r) => r.output)).toEqual(["slow", "fast"]);
  });

  it("catches thrown errors and returns error result", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "Tool1", throwingTool("boom!"), schema, true);

    const results = await executeBatch(buildPlan(1), registry, alwaysAllow);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("boom!");
  });

  it("returns error for unknown tools", async () => {
    const registry = createToolRegistry();
    const results = await executeBatch(buildPlan(1), registry, alwaysAllow);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("Unknown tool");
  });

  it("denies execution when permission check fails", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "Tool1", toolWithDelay(0, "ok"), schema, true);

    const deny: PermissionSystem = {
      checkPermission: async () => "denied",
    };

    const results = await executeBatch(buildPlan(1), registry, deny);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("Permission denied");
  });

  it("executes mixed batch: concurrent first, then serial", async () => {
    const registry = createToolRegistry();
    const order: string[] = [];
    registerTool(registry, "Read", async () => {
      order.push("read");
      return { output: "r" };
    }, schema, true);
    registerTool(registry, "Write", async () => {
      order.push("write");
      return { output: "w" };
    }, schema, false);

    const plan: BatchPlan = {
      concurrent: [{ name: "Read", args: {}, id: 1 }],
      serial: [{ name: "Write", args: {}, id: 2 }],
    };

    await executeBatch(plan, registry, alwaysAllow);
    // Concurrent group MUST finish before serial group starts
    expect(order).toEqual(["read", "write"]);
  });
});
