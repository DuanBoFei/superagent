import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createRuntime } from "../../src/runtime/runtime";
import { dispatchTools } from "../../src/runtime/tool-dispatcher";
import { State, type Prompt, type Token, type TurnEvent } from "../../src/runtime/types";
import type { Config } from "../../src/config/types";
import type { LogEvent } from "../../src/observability/types";
import { createToolRegistry, registerTool } from "../../src/tools/registry";

vi.mock("../../src/mcp/manager", () => ({
  createMcpManager: () => ({
    getSessions: () => [],
    listTools: () => [],
    connectAll: async () => {},
    refreshTools: async () => {},
    getSession: () => undefined,
  }),
}));

const node = process.execPath;

function hookScript(source: string): string[] {
  return ["-e", source];
}

function baseConfig(overrides: Partial<Config> = {}): Config {
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
    hooks: {},
    ...overrides,
  };
}

async function collect(stream: AsyncGenerator<TurnEvent>): Promise<TurnEvent[]> {
  const events: TurnEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe("hook lifecycle integration", () => {
  it("runs SessionStart, blocks a prompt before model request, and redacts hook diagnostics", async () => {
    let modelCalled = false;
    const logEvents: LogEvent[] = [];
    const runtime = createRuntime({
      config: baseConfig({
        hooks: {
          SessionStart: [{
            name: "session-start",
            enabled: true,
            command: node,
            args: hookScript("process.stdin.resume(); process.stdin.on('end', () => console.log(JSON.stringify({ decision: 'continue' })))"),
            env: {},
            timeoutMs: 3000,
          }],
          UserPromptSubmit: [{
            name: "prompt-policy",
            enabled: true,
            command: node,
            args: hookScript("process.stdin.resume(); process.stdin.on('end', () => console.log(JSON.stringify({ decision: 'block', message: 'blocked api_key=SECRET123' })))"),
            env: {},
            timeoutMs: 3000,
          }],
        },
      }),
      emit: (event) => logEvents.push(event),
      sendMessage: async function* () {
        modelCalled = true;
        yield { type: "text", content: "should not happen" } satisfies Token;
      },
      checkPermission: () => ({ allowed: true }),
      saveSession: () => {},
    });

    const turnEvents = await collect(runtime.startTurn("please deploy production"));

    expect(modelCalled).toBe(false);
    expect(turnEvents).toContainEqual({ type: "error", message: "blocked api_key=[REDACTED]" });
    expect(logEvents.map((event) => event.type)).toContain("hook:end");
    expect(logEvents).toContainEqual(expect.objectContaining({
      type: "hook:block",
      hookName: "prompt-policy",
      hookEvent: "UserPromptSubmit",
      message: "blocked api_key=[REDACTED]",
    }));
  });

  it("blocks PreToolUse before execution and preserves PostToolUse results", async () => {
    let executed = false;
    const registry = createToolRegistry();
    registerTool(registry, "BlockedTool", async () => {
      executed = true;
      return { output: "blocked tool executed" };
    }, z.object({}), false);
    registerTool(registry, "ObservedTool", async () => ({ output: "original result" }), z.object({}), false);

    const blocked = await dispatchTools(
      [{ name: "BlockedTool", args: {} }],
      {
        registry,
        hookManager: {
          async dispatch(eventName) {
            return eventName === "PreToolUse"
              ? { decision: "block", message: "no side effect", results: [] }
              : { decision: "continue", results: [] };
          },
        },
        permission: { async checkPermission() { return "approved"; } },
      },
    );

    const observed = await dispatchTools(
      [{ name: "ObservedTool", args: {} }],
      {
        registry,
        hookManager: {
          async dispatch(eventName) {
            return eventName === "PostToolUse"
              ? { decision: "block", message: "mutated", results: [] }
              : { decision: "continue", results: [] };
          },
        },
        permission: { async checkPermission() { return "approved"; } },
      },
    );

    expect(executed).toBe(false);
    expect(blocked).toEqual([{ name: "BlockedTool", success: false, output: "no side effect", error: "no side effect" }]);
    expect(observed).toEqual([{ name: "ObservedTool", success: true, output: "original result", error: undefined }]);
  });

  it("isolates observe-only hook failures and redacts non-zero diagnostics", async () => {
    const logEvents: LogEvent[] = [];
    const runtime = createRuntime({
      config: baseConfig({
        hooks: {
          SessionStart: [{
            name: "failing-observer",
            enabled: true,
            command: node,
            args: hookScript("console.error('api_key=SECRET123'); process.exit(2)"),
            env: {},
            timeoutMs: 3000,
          }],
        },
      }),
      emit: (event) => logEvents.push(event),
      composePrompt: (): Prompt => ({ system: "test", messages: [] }),
      sendMessage: async function* () {
        yield { type: "text", content: "model response" } satisfies Token;
      },
      checkPermission: () => ({ allowed: true }),
      saveSession: () => {},
    });

    const turnEvents = await collect(runtime.startTurn("hello"));

    expect(turnEvents).toContainEqual({ type: "text", content: "model response" });
    expect(turnEvents.find((event) => event.type === "turn_end")).toMatchObject({
      type: "turn_end",
      summary: { reason: "completed" },
    });
    expect(logEvents).toContainEqual(expect.objectContaining({
      type: "hook:failure",
      hookName: "failing-observer",
      hookEvent: "SessionStart",
      stderr: "api_key=[REDACTED]\n",
      exitCode: 2,
    }));
  });

  it("fires PreCompact without blocking model flow", async () => {
    const logEvents: LogEvent[] = [];
    const runtime = createRuntime({
      config: baseConfig({
        hooks: {
          PreCompact: [{
            name: "pre-compact",
            enabled: true,
            command: node,
            args: hookScript("process.stdin.resume(); process.stdin.on('end', () => console.log(JSON.stringify({ decision: 'continue' })))"),
            env: {},
            timeoutMs: 3000,
          }],
        },
      }),
      emit: (event) => logEvents.push(event),
      composePrompt: (): Prompt => ({ system: "test", messages: [], compacted: true }),
      sendMessage: async function* () {
        yield { type: "text", content: "after compact" } satisfies Token;
      },
      checkPermission: () => ({ allowed: true }),
      saveSession: () => {},
    });

    const turnEvents = await collect(runtime.startTurn("hello"));

    expect(turnEvents).toContainEqual({ type: "text", content: "after compact" });
    expect(logEvents).toContainEqual(expect.objectContaining({
      type: "hook:end",
      hookName: "pre-compact",
      hookEvent: "PreCompact",
      decision: "continue",
    }));
  });
});
