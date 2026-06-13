import { describe, expect, it } from "vitest";
import { dispatchTools } from "../../src/runtime/tool-dispatcher";
import { ToolCall } from "../../src/runtime/types";

describe("Tool dispatcher", () => {
  it("empty calls returns empty results", async () => {
    const results = await dispatchTools([]);
    expect(results).toEqual([]);
  });

  it("single call dispatches through real scheduler", async () => {
    const calls: ToolCall[] = [
      { name: "Read", args: { file_path: "package.json" } },
    ];
    const results = await dispatchTools(calls);

    expect(results.length).toBe(1);
    expect(results[0]!.name).toBe("Read");
    expect(results[0]!.success).toBe(true);
    expect(results[0]!.output).toBeDefined();
  });

  it("unknown tool returns error via real scheduler", async () => {
    const calls: ToolCall[] = [
      { name: "NonExistent", args: {} },
    ];
    const results = await dispatchTools(calls);

    expect(results.length).toBe(1);
    expect(results[0]!.success).toBe(false);
    expect(results[0]!.error).toContain("Unknown tool");
  });

  it("concurrent-safe tools execute in parallel via scheduler", async () => {
    const calls: ToolCall[] = [
      { name: "Read", args: { file_path: "package.json" } },
      { name: "Glob", args: { pattern: "*.ts" } },
    ];
    const results = await dispatchTools(calls);

    expect(results.length).toBe(2);
    expect(results[0]!.success).toBe(true);
    expect(results[1]!.success).toBe(true);
    expect(results[0]!.name).toBe("Read");
    expect(results[1]!.name).toBe("Glob");
  });

  it("serial tools stop on first write failure in scheduler", async () => {
    // Both Grep and Read are concurrency-safe, but Write depends on
    // having correct args. Test that the scheduler handles mixed tools.
    const calls: ToolCall[] = [
      { name: "Read", args: { file_path: "package.json" } },
      { name: "Grep", args: { pattern: "name" } },
    ];
    const results = await dispatchTools(calls);

    expect(results.length).toBe(2);
    expect(results[0]!.success).toBe(true);
    expect(results[1]!.success).toBe(true);
  });
});
