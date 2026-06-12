import { describe, expect, it } from "vitest";
import { dispatchTools } from "../../src/runtime/tool-dispatcher";
import { ToolCall } from "../../src/runtime/types";

describe("Tool dispatcher", () => {
  it("empty calls returns empty results", async () => {
    const results = await dispatchTools([]);
    expect(results).toEqual([]);
  });

  it("single call returns single result", async () => {
    const calls: ToolCall[] = [
      { name: "Read", args: { file_path: "/src/main.ts" } },
    ];
    const results = await dispatchTools(calls);

    expect(results.length).toBe(1);
    expect(results[0]!.name).toBe("Read");
    expect(results[0]!.success).toBe(true);
    expect(results[0]!.output).toContain("[STUB]");
  });

  it("mixed success and failure returns partial results", async () => {
    const calls: ToolCall[] = [
      { name: "Read", args: { file_path: "/exists.ts" } },
      { name: "Bash", args: { command: "rm -rf /" } },
    ];
    const results = await dispatchTools(calls);

    expect(results.length).toBe(2);
    expect(results[0]!.success).toBe(true);
    expect(results[1]!.success).toBe(false);
    expect(results[1]!.error).toBeDefined();
  });

  it("3 consecutive identical tool calls injects warning", async () => {
    const calls: ToolCall[] = [
      { name: "Grep", args: { pattern: "missingFunc" } },
      { name: "Grep", args: { pattern: "missingFunc" } },
      { name: "Grep", args: { pattern: "missingFunc" } },
    ];
    const results = await dispatchTools(calls);

    expect(results.length).toBe(3);
    // All three should succeed
    expect(results[0]!.success).toBe(true);
    expect(results[1]!.success).toBe(true);
    // Third call should have a warning about repetition
    expect(results[2]!.output).toContain("called 3 times");
    expect(results[2]!.output).toContain("Grep");
  });

  it("2 consecutive identical calls does not inject warning", async () => {
    const calls: ToolCall[] = [
      { name: "Grep", args: { pattern: "missingFunc" } },
      { name: "Grep", args: { pattern: "missingFunc" } },
    ];
    const results = await dispatchTools(calls);

    expect(results[0]!.success).toBe(true);
    expect(results[1]!.success).toBe(true);
    expect(results[1]!.output).not.toContain("called 3 times");
  });
});
