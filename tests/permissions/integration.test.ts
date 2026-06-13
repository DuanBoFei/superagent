import { describe, expect, it } from "vitest";
import { createScheduler } from "../../src/scheduling/scheduler";
import { createToolRegistry, registerTool } from "../../src/tools/registry";
import { createChecker } from "../../src/permissions/checker";
import { z } from "zod";
import type { PermissionSystem, ToolCall } from "../../src/scheduling/types";
import type { PromptFn } from "../../src/permissions/types";
import type { ToolContext } from "../../src/tools/types";

const schema = z.object({});

function toolWithResult(output: string) {
  return async (_args: Record<string, unknown>, _ctx: ToolContext) => ({
    output,
  });
}

describe("permission scheduler integration", () => {
  it("auto-approved tool executes without prompt", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "Read", toolWithResult("ok"), schema, true);

    let promptCalled = false;
    const promptFn: PromptFn = async () => {
      promptCalled = true;
      return "approved";
    };

    const checker = createChecker(
      { autoApprove: ["Read:*"], deny: [], askTimeout: 30000 },
      promptFn,
    );

    const scheduler = createScheduler(registry, checker);
    const calls: ToolCall[] = [{ name: "Read", args: { file_path: "x.ts" }, id: 1 }];
    const results = await scheduler.dispatchTools(calls);

    expect(results[0].success).toBe(true);
    expect(results[0].output).toBe("ok");
    expect(promptCalled).toBe(false);
  });

  it("denied tool returns error without prompt", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "Bash", toolWithResult("ok"), schema, false);

    let promptCalled = false;
    const promptFn: PromptFn = async () => {
      promptCalled = true;
      return "approved";
    };

    const checker = createChecker(
      { autoApprove: [], deny: ["Bash:rm *"], askTimeout: 30000 },
      promptFn,
    );

    const scheduler = createScheduler(registry, checker);
    const calls: ToolCall[] = [{ name: "Bash", args: { command: "rm -rf build/" }, id: 1 }];
    const results = await scheduler.dispatchTools(calls);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("Permission denied");
    expect(promptCalled).toBe(false);
  });

  it("deny wins over auto-approve for matching both", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "Bash", toolWithResult("ok"), schema, false);

    let promptCalled = false;
    const promptFn: PromptFn = async () => {
      promptCalled = true;
      return "approved";
    };

    const checker = createChecker(
      {
        autoApprove: ["Bash:*"],
        deny: ["Bash:rm *"],
        askTimeout: 30000,
      },
      promptFn,
    );

    const scheduler = createScheduler(registry, checker);
    const calls: ToolCall[] = [{ name: "Bash", args: { command: "rm file.txt" }, id: 1 }];
    const results = await scheduler.dispatchTools(calls);

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("Permission denied");
    expect(promptCalled).toBe(false);
  });
});
