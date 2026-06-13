import { describe, expect, it } from "vitest";
import { partition } from "../../src/scheduling/partitioner";
import { createToolRegistry, registerTool } from "../../src/tools/registry";
import { z } from "zod";

const noop = async () => ({ output: "" });
const schema = z.object({});

function makeRegistry(safe: string[], unsafe: string[]) {
  const registry = createToolRegistry();
  for (const name of safe) registerTool(registry, name, noop, schema, true);
  for (const name of unsafe) registerTool(registry, name, noop, schema, false);
  return registry;
}

function call(name: string, id: number) {
  return { name, args: {}, id };
}

describe("partitioner", () => {
  it("puts all safe tools in concurrent group", () => {
    const registry = makeRegistry(["Read", "Grep", "Glob"], []);
    const plan = partition(
      [call("Read", 1), call("Grep", 2), call("Glob", 3)],
      registry,
    );
    expect(plan.concurrent).toHaveLength(3);
    expect(plan.serial).toHaveLength(0);
  });

  it("puts all unsafe tools in serial group", () => {
    const registry = makeRegistry([], ["Write", "Edit", "Bash"]);
    const plan = partition(
      [call("Write", 1), call("Edit", 2), call("Bash", 3)],
      registry,
    );
    expect(plan.concurrent).toHaveLength(0);
    expect(plan.serial).toHaveLength(3);
  });

  it("splits a mixed batch correctly and preserves order within groups", () => {
    const registry = makeRegistry(["Read", "Grep"], ["Write", "Edit"]);
    const plan = partition(
      [call("Read", 1), call("Write", 2), call("Grep", 3), call("Edit", 4)],
      registry,
    );
    expect(plan.concurrent.map((c) => c.id)).toEqual([1, 3]);
    expect(plan.serial.map((c) => c.id)).toEqual([2, 4]);
  });

  it("returns empty groups for empty input", () => {
    const registry = makeRegistry(["Read"], ["Write"]);
    const plan = partition([], registry);
    expect(plan.concurrent).toHaveLength(0);
    expect(plan.serial).toHaveLength(0);
  });

  it("places unknown tools in serial group as safer default", () => {
    const registry = createToolRegistry();
    const plan = partition([call("UnknownTool", 1)], registry);
    expect(plan.concurrent).toHaveLength(0);
    expect(plan.serial).toHaveLength(1);
    expect(plan.serial[0].name).toBe("UnknownTool");
  });
});
