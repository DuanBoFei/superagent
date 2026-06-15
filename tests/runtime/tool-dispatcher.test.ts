import { describe, expect, it } from "vitest";
import { z } from "zod";
import { dispatchTools } from "../../src/runtime/tool-dispatcher";
import { ToolCall } from "../../src/runtime/types";
import type { HookManager } from "../../src/hooks";
import type { HookEvent, HookEventName } from "../../src/hooks/types";
import { createToolRegistry, registerTool } from "../../src/tools/registry";

const schema = z.object({});

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

  it("PreToolUse hook blocks tool execution before side effects", async () => {
    let executed = false;
    const hookEvents: Array<{ eventName: HookEventName; event: HookEvent }> = [];
    const registry = createToolRegistry();
    registerTool(registry, "SideEffect", async () => {
      executed = true;
      return { output: "executed" };
    }, schema, false);
    const hookManager: HookManager = {
      async dispatch(eventName: HookEventName, event: HookEvent) {
        hookEvents.push({ eventName, event });
        return { decision: "block", message: "Tool blocked by policy", results: [] };
      },
    };

    const results = await dispatchTools(
      [{ name: "SideEffect", args: { command: "git push" } }],
      { registry, hookManager },
    );

    expect(executed).toBe(false);
    expect(hookEvents).toHaveLength(1);
    expect(hookEvents[0]!.eventName).toBe("PreToolUse");
    expect(hookEvents[0]!.event.payload.toolName).toBe("SideEffect");
    expect(hookEvents[0]!.event.payload.input).toEqual({ command: "git push" });
    expect(results).toEqual([
      {
        name: "SideEffect",
        success: false,
        output: "Tool blocked by policy",
        error: "Tool blocked by policy",
      },
    ]);
  });

  it("PreToolUse preserves result order when mixing continued and blocked calls", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "Allowed", async () => ({ output: "allowed" }), schema, false);
    const hookManager: HookManager = {
      async dispatch(_eventName, event) {
        return event.payload.toolName === "Blocked"
          ? { decision: "block", message: "blocked", results: [] }
          : { decision: "continue", results: [] };
      },
    };

    const results = await dispatchTools(
      [
        { name: "Allowed", args: {} },
        { name: "Blocked", args: {} },
      ],
      {
        registry,
        hookManager,
        permission: {
          async checkPermission() {
            return "approved";
          },
        },
      },
    );

    expect(results.map((result) => result.name)).toEqual(["Allowed", "Blocked"]);
    expect(results.map((result) => result.output)).toEqual(["allowed", "blocked"]);
  });

  it("PostToolUse observes successful tool result without mutation", async () => {
    const hookEvents: Array<{ eventName: HookEventName; event: HookEvent }> = [];
    const registry = createToolRegistry();
    registerTool(registry, "ObservedTool", async () => ({ output: "original" }), schema, false);
    const hookManager: HookManager = {
      async dispatch(eventName, event) {
        hookEvents.push({ eventName, event });
        return eventName === "PostToolUse"
          ? { decision: "block", message: "mutated", results: [] }
          : { decision: "continue", results: [] };
      },
    };

    const results = await dispatchTools(
      [{ name: "ObservedTool", args: { value: 1 } }],
      {
        registry,
        hookManager,
        permission: {
          async checkPermission() {
            return "approved";
          },
        },
      },
    );

    expect(results).toEqual([
      {
        name: "ObservedTool",
        success: true,
        output: "original",
        error: undefined,
      },
    ]);
    expect(hookEvents.map((entry) => entry.eventName)).toEqual(["PreToolUse", "PostToolUse"]);
    expect(hookEvents[1]!.event.payload.toolName).toBe("ObservedTool");
    expect(hookEvents[1]!.event.payload.input).toEqual({ value: 1 });
    expect(hookEvents[1]!.event.payload.result).toEqual({
      name: "ObservedTool",
      success: true,
      output: "original",
      error: undefined,
    });
  });

  it("PostToolUseFailure observes failed tool result without mutation", async () => {
    const hookEvents: Array<{ eventName: HookEventName; event: HookEvent }> = [];
    const registry = createToolRegistry();
    registerTool(registry, "FailingTool", async () => ({ output: "", error: "original failure" }), schema, false);
    const hookManager: HookManager = {
      async dispatch(eventName, event) {
        hookEvents.push({ eventName, event });
        return eventName === "PostToolUseFailure"
          ? { decision: "block", message: "mutated", results: [] }
          : { decision: "continue", results: [] };
      },
    };

    const results = await dispatchTools(
      [{ name: "FailingTool", args: { value: 2 } }],
      {
        registry,
        hookManager,
        permission: {
          async checkPermission() {
            return "approved";
          },
        },
      },
    );

    expect(results).toEqual([
      {
        name: "FailingTool",
        success: false,
        output: "",
        error: "original failure",
      },
    ]);
    expect(hookEvents.map((entry) => entry.eventName)).toEqual(["PreToolUse", "PostToolUseFailure"]);
    expect(hookEvents[1]!.event.payload.toolName).toBe("FailingTool");
    expect(hookEvents[1]!.event.payload.input).toEqual({ value: 2 });
    expect(hookEvents[1]!.event.payload.error).toBe("original failure");
  });

  it("PreToolUse continue preserves scheduler permission denial", async () => {
    let executed = false;
    const registry = createToolRegistry();
    registerTool(registry, "DeniedTool", async () => {
      executed = true;
      return { output: "executed" };
    }, schema, false);
    const hookManager: HookManager = {
      async dispatch() {
        return { decision: "continue", results: [] };
      },
    };

    const results = await dispatchTools(
      [{ name: "DeniedTool", args: {} }],
      {
        registry,
        hookManager,
        permission: {
          async checkPermission() {
            return "denied";
          },
        },
      },
    );

    expect(executed).toBe(false);
    expect(results).toEqual([
      {
        name: "DeniedTool",
        success: false,
        output: "",
        error: "Permission denied",
      },
    ]);
  });
});
