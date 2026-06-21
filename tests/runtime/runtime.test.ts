import { describe, expect, it, vi } from "vitest";
import { createRuntime } from "../../src/runtime/runtime";
import type { ModelToolDefinition } from "../../src/models/types";
import { TurnEvent, Token } from "../../src/runtime/types";
import type { HookManager } from "../../src/hooks";
import type { HookEvent, HookEventName } from "../../src/hooks/types";

vi.mock("../../src/mcp/manager", () => ({
  createMcpManager: () => ({
    getSessions: () => [],
    listTools: () => [],
    connectAll: async () => {},
    refreshTools: async () => {},
    getSession: () => undefined,
  }),
}));

const { createRuntime } = await import("../../src/runtime/runtime");

async function collect(
  stream: AsyncGenerator<TurnEvent>,
): Promise<TurnEvent[]> {
  const events: TurnEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

async function* textModel(): AsyncGenerator<Token> {
  yield { type: "text", content: "provider response" };
}

describe("Runtime public API", () => {
  it("startTurn yields text from model and completes", async () => {
    const runtime = createRuntime({ sendMessage: textModel });
    const stream = runtime.startTurn("hello");

    const events = await collect(stream);

    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThanOrEqual(1);
    expect(textEvents[0]!.type).toBe("text");

    const turnEnd = events.find((e) => e.type === "turn_end");
    expect(turnEnd).toBeDefined();
    if (turnEnd!.type === "turn_end") {
      expect(turnEnd.summary.reason).toBe("completed");
    }
  });

  it("Ctrl+C sets interruptFlag and turn ends with interrupted", async () => {
    const runtime = createRuntime({
      sendMessage: async function* () {
        // Simulate SIGINT mid-stream by setting interrupt flag
        runtime.getSession().interruptFlag = true;
        yield { type: "text", content: "partial response" };
      },
    });

    const stream = runtime.startTurn("something");
    const events = await collect(stream);

    const turnEnd = events.find((e) => e.type === "turn_end");
    expect(turnEnd).toBeDefined();
    if (turnEnd!.type === "turn_end") {
      expect(turnEnd.summary.reason).toBe("interrupted");
    }
  });

  it("resumeSession loads with given sessionId and yields text", async () => {
    const runtime = createRuntime({ sendMessage: textModel, loadSession: () => null });
    const stream = runtime.resumeSession("test-session-id");

    const events = await collect(stream);

    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThanOrEqual(1);

    const turnEnd = events.find((e) => e.type === "turn_end");
    expect(turnEnd).toBeDefined();
    if (turnEnd!.type === "turn_end") {
      expect(turnEnd.summary.reason).toBe("completed");
    }

    expect(runtime.getSession().sessionId).toBe("test-session-id");
  });

  it("passes built-in tool definitions to model prompts", async () => {
    let tools: ModelToolDefinition[] | undefined;
    const runtime = createRuntime({
      sendMessage: async function* (prompt) {
        tools = prompt.tools;
        yield { type: "text", content: "ok" };
      },
    });

    await collect(runtime.startTurn("read a file"));

    expect(tools?.some((tool) => tool.function.name === "Read")).toBe(true);
    expect(tools?.find((tool) => tool.function.name === "Read")?.function.parameters).toMatchObject({
      type: "object",
      properties: {
        file_path: { type: "string" },
      },
      required: ["file_path"],
      additionalProperties: false,
    });
  });

  it("two consecutive turns increments turnNumber", async () => {
    const runtime = createRuntime({ sendMessage: textModel });

    const stream1 = runtime.startTurn("first message");
    await collect(stream1);
    expect(runtime.getSession().turnNumber).toBe(1);

    const stream2 = runtime.startTurn("second message");
    await collect(stream2);
    expect(runtime.getSession().turnNumber).toBe(2);
  });

  it("fires SessionStart before a new turn and Stop after shutdown", async () => {
    const seen: Array<{ eventName: HookEventName; event: HookEvent }> = [];
    const hookManager: HookManager = {
      async dispatch(eventName, event) {
        seen.push({ eventName, event });
        return { decision: "continue", results: [] };
      },
    };
    const runtime = createRuntime({ sendMessage: textModel, hookManager });

    await collect(runtime.startTurn("hello"));

    expect(seen.map((entry) => entry.eventName)).toEqual(["SessionStart", "UserPromptSubmit", "Stop"]);
    expect(seen[0]!.event.payload).toEqual({ resumed: false });
    expect(seen[2]!.event.payload.reason).toBe("completed");
  });

  it("fires SessionStart as resumed before resuming a session", async () => {
    const seen: Array<{ eventName: HookEventName; event: HookEvent }> = [];
    const hookManager: HookManager = {
      async dispatch(eventName, event) {
        seen.push({ eventName, event });
        return { decision: "continue", results: [] };
      },
    };
    const runtime = createRuntime({ sendMessage: textModel, hookManager });

    await collect(runtime.resumeSession("test-session-id"));

    expect(seen[0]!.eventName).toBe("SessionStart");
    expect(seen[0]!.event.sessionId).toBe("test-session-id");
    expect(seen[0]!.event.payload).toEqual({ resumed: true });
  });

  it("observe-only lifecycle hook blocks do not prevent turn completion", async () => {
    const hookManager: HookManager = {
      async dispatch(eventName) {
        return eventName === "SessionStart" || eventName === "Stop"
          ? { decision: "block", message: "observe-only block", results: [] }
          : { decision: "continue", results: [] };
      },
    };
    const runtime = createRuntime({ sendMessage: textModel, hookManager });

    const events = await collect(runtime.startTurn("hello"));

    const turnEnd = events.find((event) => event.type === "turn_end");
    expect(turnEnd).toBeDefined();
    if (turnEnd!.type === "turn_end") {
      expect(turnEnd.summary.reason).toBe("completed");
    }
  });

  it("loadHistory loads session from persistence and sets sessionId", () => {
    const runtime = createRuntime({
      sendMessage: textModel,
      loadSession: () => ({
        sessionId: "loaded-session",
        turnNumber: 5,
        messages: [
          { role: "user" as const, content: "previous message" },
        ],
        toolResults: [],
        state: "IDLE" as const,
        interruptFlag: false,
        startedAt: Date.now(),
      }),
    });

    runtime.loadHistory("loaded-session");

    const session = runtime.getSession();
    expect(session.sessionId).toBe("loaded-session");
    expect(session.turnNumber).toBe(5);
    expect(session.messages).toHaveLength(1);
    expect(session.messages[0]!.content).toBe("previous message");
    expect(session.interruptFlag).toBe(false);
  });

  it("loadHistory creates fresh session when loadSession returns null", () => {
    const runtime = createRuntime({
      sendMessage: textModel,
      loadSession: () => null,
    });

    runtime.loadHistory("missing-session");

    const session = runtime.getSession();
    expect(session.sessionId).toBe("missing-session");
    expect(session.messages).toHaveLength(0);
    expect(session.state).toBe("IDLE");
  });

  it("loadHistory does not start query loop (is synchronous)", () => {
    let loadCalled = false;
    const runtime = createRuntime({
      sendMessage: textModel,
      loadSession: () => {
        loadCalled = true;
        return {
          sessionId: "sync-test",
          turnNumber: 0,
          messages: [],
          toolResults: [],
          state: "IDLE" as const,
          interruptFlag: false,
          startedAt: Date.now(),
        };
      },
    });

    runtime.loadHistory("sync-test");

    expect(loadCalled).toBe(true);
    expect(runtime.getSession().sessionId).toBe("sync-test");
    expect(runtime.getSession().state).toBe("IDLE");
  });

  it("startTurn after loadHistory appends to loaded messages", async () => {
    const runtime = createRuntime({
      sendMessage: textModel,
      loadSession: () => ({
        sessionId: "resume-test",
        turnNumber: 3,
        messages: [
          { role: "user" as const, content: "old message" },
          { role: "assistant" as const, content: "old reply" },
        ],
        toolResults: [],
        state: "IDLE" as const,
        interruptFlag: false,
        startedAt: Date.now(),
      }),
    });

    runtime.loadHistory("resume-test");
    await collect(runtime.startTurn("new message"));

    const messages = runtime.getSession().messages;
    expect(messages.length).toBeGreaterThanOrEqual(3);
    expect(messages[0]!.content).toBe("old message");
    expect(messages[1]!.content).toBe("old reply");
    expect(messages.some((m) => m.role === "user" && m.content === "new message")).toBe(true);
  });
});
