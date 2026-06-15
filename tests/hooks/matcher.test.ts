import { describe, expect, it } from "vitest";
import { createPreToolUseEvent, createUserPromptSubmitEvent } from "../../src/hooks/events";
import { hookMatchesEvent } from "../../src/hooks/matcher";
import type { HookConfig } from "../../src/hooks/types";

const base = {
  sessionId: "session-1",
  turnId: "turn-1",
  cwd: "/repo",
  timestamp: "2026-06-14T12:00:00.000Z",
};

const bashEvent = createPreToolUseEvent({
  ...base,
  toolName: "Bash",
  input: { command: "git status" },
  permissionKey: "Bash",
});

function hook(overrides: Partial<HookConfig> = {}): HookConfig {
  return {
    name: "policy",
    enabled: true,
    command: "node",
    args: [],
    env: {},
    timeoutMs: 3000,
    ...overrides,
  } as HookConfig;
}

describe("hook matcher", () => {
  it("matches hook event names", () => {
    expect(hookMatchesEvent(hook(), "PreToolUse", bashEvent)).toBe(true);
    expect(hookMatchesEvent(hook(), "UserPromptSubmit", bashEvent)).toBe(false);
  });

  it("matches wildcard tool matcher", () => {
    expect(hookMatchesEvent(hook({ matcher: { tool: "*" } }), "PreToolUse", bashEvent)).toBe(true);
  });

  it("matches one built-in tool", () => {
    expect(hookMatchesEvent(hook({ matcher: { tool: "Bash" } }), "PreToolUse", bashEvent)).toBe(true);
    expect(hookMatchesEvent(hook({ matcher: { tool: "Read" } }), "PreToolUse", bashEvent)).toBe(false);
  });

  it("matches one MCP-style tool identity", () => {
    const event = createPreToolUseEvent({
      ...base,
      toolName: "mcp__filesystem__read_file",
      input: { path: "README.md" },
      permissionKey: "mcp__filesystem__read_file",
    });

    expect(
      hookMatchesEvent(
        hook({ matcher: { tool: "mcp__filesystem__read_file" } }),
        "PreToolUse",
        event,
      ),
    ).toBe(true);
    expect(
      hookMatchesEvent(hook({ matcher: { tool: "mcp__git__status" } }), "PreToolUse", event),
    ).toBe(false);
  });

  it("matches inputPattern against serialized tool input", () => {
    expect(
      hookMatchesEvent(hook({ matcher: { inputPattern: "git status" } }), "PreToolUse", bashEvent),
    ).toBe(true);
    expect(
      hookMatchesEvent(hook({ matcher: { inputPattern: "git push" } }), "PreToolUse", bashEvent),
    ).toBe(false);
  });

  it("matches promptPattern against submitted prompt text", () => {
    const event = createUserPromptSubmitEvent({ ...base, prompt: "please deploy production" });

    expect(
      hookMatchesEvent(hook({ matcher: { promptPattern: "deploy|delete" } }), "UserPromptSubmit", event),
    ).toBe(true);
    expect(
      hookMatchesEvent(hook({ matcher: { promptPattern: "credential" } }), "UserPromptSubmit", event),
    ).toBe(false);
  });

  it("applies to its event when no matcher is configured", () => {
    expect(hookMatchesEvent(hook(), "PreToolUse", bashEvent)).toBe(true);
  });
});
