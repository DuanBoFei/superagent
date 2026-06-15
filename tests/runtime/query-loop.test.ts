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
});
