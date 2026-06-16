import { describe, expect, it } from "vitest";
import { createQueryLoop } from "../../src/runtime/query-loop";
import type { HookManager } from "../../src/hooks";
import type { HookEvent, HookEventName } from "../../src/hooks/types";
import {
  Message,
  State,
  SessionState,
  Token,
  TurnEvent,
  Prompt,
  PermissionResult,
} from "../../src/runtime/types";

function makeSession(overrides?: Partial<SessionState>): SessionState {
  return {
    sessionId: "test-session",
    turnNumber: 0,
    messages: [{ role: "user", content: "hello" }],
    toolResults: [],
    state: State.IDLE,
    interruptFlag: false,
    startedAt: Date.now(),
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

describe("Query loop", () => {
  it("text-only message completes in 1 turn, yields text event", async () => {
    const session = makeSession();
    const loop = createQueryLoop(session, {
      maxTurns: 50,
      composePrompt: (_messages: Message[]): Prompt => ({
        system: "test",
        messages: _messages,
      }),
      sendMessage: async function* () {
        yield { type: "text", content: "Hello from stub!" } satisfies Token;
      },
      checkPermission: () => ({ allowed: true }),
      saveSession: () => {},
    });

    const events = await collect(loop);

    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThanOrEqual(1);
    expect(textEvents[0]!.type).toBe("text");

    const turnEnd = events.find((e) => e.type === "turn_end");
    expect(turnEnd).toBeDefined();
    expect(turnEnd!.type).toBe("turn_end");
    if (turnEnd!.type === "turn_end") {
      expect(turnEnd.summary.reason).toBe("completed");
    }
  });

  it("maxTurns=2 stops after 2 turns, yields turn_end with max_turns", async () => {
    const session = makeSession();
    let turnCount = 0;
    const loop = createQueryLoop(session, {
      maxTurns: 2,
      composePrompt: (messages: Message[]): Prompt => ({
        system: "test",
        messages,
      }),
      sendMessage: async function* () {
        turnCount++;
        yield {
          type: "tool_use",
          name: "Read",
          arguments: '{"file_path":"/f.ts"}',
        } satisfies Token;
      },
      checkPermission: () => ({ allowed: true }),
      saveSession: () => {},
    });

    const events = await collect(loop);

    // Should have 2 turns of tool calls
    const toolCalls = events.filter((e) => e.type === "tool_call");
    expect(toolCalls.length).toBe(2);

    const turnEnd = events.find((e) => e.type === "turn_end");
    expect(turnEnd).toBeDefined();
    if (turnEnd!.type === "turn_end") {
      expect(turnEnd.summary.reason).toBe("max_turns");
    }
  });

  it("interrupt flag set mid-loop breaks loop, yields turn_end with interrupted", async () => {
    const session = makeSession();
    let firstToken = true;
    const loop = createQueryLoop(session, {
      maxTurns: 50,
      composePrompt: (messages: Message[]): Prompt => ({
        system: "test",
        messages,
      }),
      sendMessage: async function* () {
        yield { type: "text", content: "part 1" } satisfies Token;
        // Set interrupt flag while still in the stream
        session.interruptFlag = true;
        yield { type: "text", content: "part 2" } satisfies Token;
      },
      checkPermission: () => ({ allowed: true }),
      saveSession: () => {},
    });

    const events = await collect(loop);

    const turnEnd = events.find((e) => e.type === "turn_end");
    expect(turnEnd).toBeDefined();
    if (turnEnd!.type === "turn_end") {
      expect(turnEnd.summary.reason).toBe("interrupted");
    }
  });

  it("simulated tool call yields tool_call + tool_result events", async () => {
    const session = makeSession();
    const loop = createQueryLoop(session, {
      maxTurns: 50,
      composePrompt: (messages: Message[]): Prompt => ({
        system: "test",
        messages,
      }),
      sendMessage: async function* () {
        yield {
          type: "tool_use",
          name: "Read",
          arguments: '{"file_path":"/src/main.ts"}',
        } satisfies Token;
      },
      checkPermission: (_tool, _args): PermissionResult => ({
        allowed: true,
      }),
      saveSession: () => {},
    });

    const events = await collect(loop);

    const toolCalls = events.filter((e) => e.type === "tool_call");
    expect(toolCalls.length).toBeGreaterThanOrEqual(1);
    expect(toolCalls[0]!.type).toBe("tool_call");

    const toolResults = events.filter((e) => e.type === "tool_result");
    expect(toolResults.length).toBeGreaterThanOrEqual(1);
    expect(toolResults[0]!.type).toBe("tool_result");
  });

  it("fires PreCompact when prompt composition compacts context", async () => {
    const session = makeSession();
    const seen: Array<{ eventName: HookEventName; event: HookEvent }> = [];
    const hookManager: HookManager = {
      async dispatch(eventName, event) {
        seen.push({ eventName, event });
        return { decision: "continue", results: [] };
      },
    };
    const loop = createQueryLoop(session, {
      maxTurns: 50,
      composePrompt: (messages: Message[]): Prompt & { compacted: boolean } => ({
        system: "test",
        messages,
        compacted: true,
      }),
      sendMessage: async function* () {
        yield { type: "text", content: "Hello from stub!" } satisfies Token;
      },
      checkPermission: () => ({ allowed: true }),
      saveSession: () => {},
      hookManager,
    });

    await collect(loop);

    const preCompact = seen.find((entry) => entry.eventName === "PreCompact");
    expect(preCompact).toBeDefined();
    expect(preCompact!.event.payload.reason).toBe("context_compaction");
  });

  it("DSML text tool call is dispatched as a tool call", async () => {
    const session = makeSession();
    const dispatched: Array<{ name: string; args: Record<string, unknown> }> = [];
    const loop = createQueryLoop(session, {
      maxTurns: 1,
      composePrompt: (messages: Message[]): Prompt => ({
        system: "test",
        messages,
      }),
      sendMessage: async function* () {
        yield {
          type: "text",
          content: "Let me read the file.\n\n<｜｜DSML｜｜tool_calls>\n<｜｜DSML｜｜invoke name=\"Read\">\n<｜｜DSML｜｜parameter name=\"filePath\" string=\"true\">src/runtime/runtime.ts</｜｜DSML｜｜parameter>\n</｜｜DSML｜｜invoke>\n</｜｜DSML｜｜tool_calls>",
        } satisfies Token;
      },
      checkPermission: (_tool, _args): PermissionResult => ({
        allowed: true,
      }),
      dispatchTools: async (calls) => {
        dispatched.push(...calls);
        return calls.map((call) => ({ name: call.name, success: true, output: "read ok" }));
      },
      saveSession: () => {},
    });

    const events = await collect(loop);

    expect(events).toContainEqual({ type: "text", content: "Let me read the file.\n\n" });
    expect(events).toContainEqual({
      type: "tool_call",
      name: "Read",
      args: { file_path: "src/runtime/runtime.ts" },
    });
    expect(dispatched).toEqual([{ name: "Read", args: { file_path: "src/runtime/runtime.ts" } }]);
  });

  it("dispatches structured tool calls from the model stream", async () => {
    const session = makeSession();
    const dispatched: Array<{ name: string; args: Record<string, unknown> }> = [];
    const loop = createQueryLoop(session, {
      maxTurns: 1,
      composePrompt: (messages: Message[]): Prompt => ({
        system: "test",
        messages,
      }),
      sendMessage: async function* () {
        yield {
          type: "tool_use",
          name: "Read",
          arguments: '{"file_path":"src/runtime/runtime.ts"}',
        } satisfies Token;
      },
      checkPermission: (_tool, _args): PermissionResult => ({ allowed: true }),
      dispatchTools: async (calls) => {
        dispatched.push(...calls);
        return calls.map((call) => ({ name: call.name, success: true, output: "read ok" }));
      },
      saveSession: () => {},
    });

    const events = await collect(loop);

    expect(events).toContainEqual({
      type: "tool_call",
      name: "Read",
      args: { file_path: "src/runtime/runtime.ts" },
    });
    expect(dispatched).toEqual([{ name: "Read", args: { file_path: "src/runtime/runtime.ts" } }]);
  });

  it("feeds tool results into the next model request", async () => {
    const session = makeSession({ messages: [{ role: "user", content: "analyze runtime" }] });
    const promptMessages: Message[][] = [];
    let requestCount = 0;
    const loop = createQueryLoop(session, {
      maxTurns: 3,
      composePrompt: (messages: Message[]): Prompt => {
        promptMessages.push([...messages]);
        return { system: "test", messages };
      },
      sendMessage: async function* () {
        requestCount++;
        if (requestCount === 1) {
          yield {
            type: "text",
            content: "Let me read the file.\n\n<tool>\n<name>Read</name>\n<parameter name=\"file_path\">src/runtime/runtime.ts</parameter>\n</tool>",
          } satisfies Token;
          return;
        }

        yield { type: "text", content: "createRuntime builds the runtime." } satisfies Token;
      },
      checkPermission: (_tool, _args): PermissionResult => ({ allowed: true }),
      dispatchTools: async (calls) => calls.map((call) => ({
        name: call.name,
        success: true,
        output: "FILE CONTENT: export function createRuntime() {}",
      })),
      saveSession: () => {},
    });

    const events = await collect(loop);

    expect(requestCount).toBe(2);
    expect(promptMessages.length).toBe(2);
    expect(promptMessages[1]!.some((message) => message.content.includes("[Tool result: Read] FILE CONTENT"))).toBe(true);
    expect(events).toContainEqual({ type: "text", content: "createRuntime builds the runtime." });
  });
});
