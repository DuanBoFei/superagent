import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  HookConfig,
  HookEvent,
  HookEventName,
  HookExecution,
  HookMatcher,
  HookResult,
  BlockingHookEventName,
  ObserveOnlyHookEventName,
} from "../../src/hooks/types";
import {
  BLOCKING_HOOK_EVENTS,
  HOOK_EVENTS,
  OBSERVE_ONLY_HOOK_EVENTS,
  isBlockingHookEvent,
  isObserveOnlyHookEvent,
} from "../../src/hooks/types";

describe("hook domain types", () => {
  it("lists supported hook events and classifies blocking boundaries", () => {
    expect(HOOK_EVENTS).toEqual([
      "SessionStart",
      "UserPromptSubmit",
      "PreToolUse",
      "PostToolUse",
      "PostToolUseFailure",
      "PreCompact",
      "Stop",
    ]);
    expect(BLOCKING_HOOK_EVENTS).toEqual(["UserPromptSubmit", "PreToolUse"]);
    expect(OBSERVE_ONLY_HOOK_EVENTS).toEqual([
      "SessionStart",
      "PostToolUse",
      "PostToolUseFailure",
      "PreCompact",
      "Stop",
    ]);
    expect(isBlockingHookEvent("PreToolUse")).toBe(true);
    expect(isBlockingHookEvent("PostToolUse")).toBe(false);
    expect(isObserveOnlyHookEvent("Stop")).toBe(true);
    expect(isObserveOnlyHookEvent("UserPromptSubmit")).toBe(false);
  });

  it("models hook matcher fields", () => {
    const matcher: HookMatcher = {
      tool: "mcp__filesystem__read_file",
      inputPattern: "README",
      promptPattern: "deploy|delete",
    };

    expect(matcher.tool).toBe("mcp__filesystem__read_file");
  });

  it("models enabled and disabled local command hook config", () => {
    const enabled: HookConfig = {
      name: "prompt-policy",
      enabled: true,
      command: "node",
      args: ["scripts/hooks/prompt-policy.js"],
      env: { POLICY: "strict" },
      timeoutMs: 3000,
      blocking: true,
      matcher: { promptPattern: "secret" },
    };
    const disabled: HookConfig = {
      name: "disabled-policy",
      enabled: false,
      args: [],
      env: {},
      timeoutMs: 3000,
    };

    expect(enabled.command).toBe("node");
    expect(disabled.enabled).toBe(false);
  });

  it("models lifecycle event payload variants", () => {
    const promptEvent: HookEvent = {
      event: "UserPromptSubmit",
      sessionId: "session-1",
      turnId: "turn-1",
      timestamp: "2026-06-14T12:00:00.000Z",
      cwd: "/repo",
      payload: {
        prompt: "deploy production",
      },
    };
    const toolEvent: HookEvent = {
      event: "PreToolUse",
      sessionId: "session-1",
      turnId: "turn-1",
      timestamp: "2026-06-14T12:00:00.000Z",
      cwd: "/repo",
      payload: {
        toolName: "Bash",
        input: { command: "git status" },
        permissionKey: "Bash",
      },
    };

    expect(promptEvent.payload.prompt).toContain("deploy");
    expect(toolEvent.payload.toolName).toBe("Bash");
  });

  it("models hook execution metadata", () => {
    const execution: HookExecution = {
      hookName: "bash-policy",
      event: "PreToolUse",
      command: "node",
      args: ["policy.js"],
      startedAt: "2026-06-14T12:00:00.000Z",
    };

    expect(execution.event).toBe("PreToolUse");
  });

  it("models continue and block hook results", () => {
    const ok: HookResult = {
      ok: true,
      decision: "continue",
      message: "ok",
      durationMs: 12,
      stdout: "{\"decision\":\"continue\"}",
      stderr: "",
    };
    const blocked: HookResult = {
      ok: true,
      decision: "block",
      message: "Blocked by policy",
      durationMs: 13,
      stdout: "{\"decision\":\"block\"}",
      stderr: "",
    };
    const failed: HookResult = {
      ok: false,
      decision: "continue",
      message: "Hook command failed",
      durationMs: 14,
      stdout: "",
      stderr: "not found",
      error: {
        code: "COMMAND_NOT_FOUND",
        message: "Command not found",
      },
    };

    expect(ok.decision).toBe("continue");
    expect(blocked.decision).toBe("block");
    expect(failed.ok).toBe(false);
  });

  it("exposes compile-time event name partitions", () => {
    expectTypeOf<BlockingHookEventName>().toEqualTypeOf<"UserPromptSubmit" | "PreToolUse">();
    expectTypeOf<ObserveOnlyHookEventName>().toEqualTypeOf<
      "SessionStart" | "PostToolUse" | "PostToolUseFailure" | "PreCompact" | "Stop"
    >();
    expectTypeOf<HookEventName>().toEqualTypeOf<BlockingHookEventName | ObserveOnlyHookEventName>();
  });
});
