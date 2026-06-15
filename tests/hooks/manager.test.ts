import { describe, expect, it } from "vitest";
import { createHookManager } from "../../src/hooks";
import { createPreToolUseEvent, createSessionStartEvent } from "../../src/hooks/events";
import type { Config } from "../../src/config/types";
import type { HookConfig } from "../../src/hooks/types";

const base = {
  sessionId: "session-1",
  turnId: "turn-1",
  cwd: "/repo",
  timestamp: "2026-06-14T12:00:00.000Z",
};

function enabledHook(name: string, overrides: Partial<Extract<HookConfig, { enabled: true }>> = {}): Extract<HookConfig, { enabled: true }> {
  return {
    name,
    enabled: true,
    command: "node",
    args: [],
    env: {},
    timeoutMs: 3000,
    ...overrides,
  };
}

function disabledHook(name: string): Extract<HookConfig, { enabled: false }> {
  return {
    name,
    enabled: false,
    args: [],
    env: {},
    timeoutMs: 3000,
  };
}

function config(hooks: Config["hooks"]): Config {
  return {
    apiKey: "test-key",
    model: "model",
    baseUrl: "https://example.com",
    maxTurns: 50,
    fallbackModel: "fallback",
    fallbackBaseUrl: "https://example.com",
    permissions: { autoApprove: [], deny: [], askTimeout: 30 },
    rulesFile: "CLAUDE.md",
    mcpServers: {},
    hooks,
  };
}

describe("hook manager", () => {
  it("runs enabled matching hooks sequentially in config order", async () => {
    const calls: string[] = [];
    const manager = createHookManager(config({
      PreToolUse: [enabledHook("first"), enabledHook("second")],
    }), {
      execute: async (hook) => {
        calls.push(hook.name);
        return { ok: true, decision: "continue", durationMs: 1, stdout: "", stderr: "", exitCode: 0 };
      },
    });

    const result = await manager.dispatch("PreToolUse", createPreToolUseEvent({
      ...base,
      toolName: "Bash",
      input: { command: "git status" },
      permissionKey: "Bash",
    }));

    expect(calls).toEqual(["first", "second"]);
    expect(result.decision).toBe("continue");
    expect(result.results.map((item) => item.hook.name)).toEqual(["first", "second"]);
  });

  it("ignores disabled hooks and non-matching hooks", async () => {
    const calls: string[] = [];
    const manager = createHookManager(config({
      PreToolUse: [
        disabledHook("disabled"),
        enabledHook("read-only", { matcher: { tool: "Read" } }),
        enabledHook("bash-only", { matcher: { tool: "Bash" } }),
      ],
    }), {
      execute: async (hook) => {
        calls.push(hook.name);
        return { ok: true, decision: "continue", durationMs: 1, stdout: "", stderr: "", exitCode: 0 };
      },
    });

    await manager.dispatch("PreToolUse", createPreToolUseEvent({
      ...base,
      toolName: "Bash",
      input: { command: "git status" },
      permissionKey: "Bash",
    }));

    expect(calls).toEqual(["bash-only"]);
  });

  it("stops on blocking results for blocking events", async () => {
    const calls: string[] = [];
    const manager = createHookManager(config({
      PreToolUse: [enabledHook("blocker"), enabledHook("after")],
    }), {
      execute: async (hook) => {
        calls.push(hook.name);
        return {
          ok: true,
          decision: hook.name === "blocker" ? "block" : "continue",
          message: hook.name === "blocker" ? "blocked" : undefined,
          durationMs: 1,
          stdout: "",
          stderr: "",
          exitCode: 0,
        };
      },
    });

    const result = await manager.dispatch("PreToolUse", createPreToolUseEvent({
      ...base,
      toolName: "Bash",
      input: { command: "git push" },
      permissionKey: "Bash",
    }));

    expect(calls).toEqual(["blocker"]);
    expect(result.decision).toBe("block");
    expect(result.message).toBe("blocked");
  });

  it("normalizes observe-only block decisions as hook failures and continues", async () => {
    const manager = createHookManager(config({ SessionStart: [enabledHook("observer")] }), {
      execute: async () => ({
        ok: true,
        decision: "block",
        message: "cannot block startup",
        durationMs: 1,
        stdout: "",
        stderr: "",
        exitCode: 0,
      }),
    });

    const result = await manager.dispatch("SessionStart", createSessionStartEvent({ ...base }));

    expect(result.decision).toBe("continue");
    expect(result.results[0].result.ok).toBe(false);
    expect(result.results[0].result.error).toEqual({
      code: "OBSERVE_ONLY_BLOCK",
      message: "Observe-only hook cannot block runtime flow",
      detail: "cannot block startup",
    });
  });
});
