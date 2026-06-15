import { describe, expect, it } from "vitest";
import { createQueryLoop } from "../../src/runtime/query-loop";
import { State, type Message, type PermissionResult, type Prompt, type SessionState, type Token, type TurnEvent } from "../../src/runtime/types";
import type { HookManager } from "../../src/hooks";
import type { HookEvent, HookEventName } from "../../src/hooks/types";

function makeSession(overrides?: Partial<SessionState>): SessionState {
  return {
    sessionId: "test-session",
    turnNumber: 0,
    messages: [{ role: "user", content: "please deploy production" }],
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

function baseDeps(overrides: Partial<Parameters<typeof createQueryLoop>[1]> = {}): Parameters<typeof createQueryLoop>[1] {
  return {
    maxTurns: 50,
    model: "model",
    composePrompt: (messages: Message[]): Prompt => ({ system: "test", messages }),
    sendMessage: async function* () {
      yield { type: "text", content: "model response" } satisfies Token;
    },
    checkPermission: (_tool, _args): PermissionResult => ({ allowed: true }),
    saveSession: () => {},
    ...overrides,
  };
}

describe("UserPromptSubmit hooks in query loop", () => {
  it("fires immediately after prompt submission and continues normal model flow", async () => {
    const seen: Array<{ eventName: HookEventName; prompt: string }> = [];
    const hookManager: HookManager = {
      async dispatch(eventName: HookEventName, event: HookEvent) {
        if (event.event === "UserPromptSubmit") {
          seen.push({ eventName, prompt: event.payload.prompt });
        }
        return { decision: "continue", results: [] };
      },
    };

    const events = await collect(createQueryLoop(makeSession(), baseDeps({ hookManager })));

    expect(seen).toEqual([{ eventName: "UserPromptSubmit", prompt: "please deploy production" }]);
    expect(events.some((event) => event.type === "text")).toBe(true);
  });

  it("blocks prompt before model request", async () => {
    let modelCalled = false;
    const hookManager: HookManager = {
      async dispatch() {
        return { decision: "block", message: "Prompt blocked by policy", results: [] };
      },
    };

    const events = await collect(createQueryLoop(makeSession(), baseDeps({
      hookManager,
      sendMessage: async function* () {
        modelCalled = true;
        yield { type: "text", content: "should not happen" } satisfies Token;
      },
    })));

    expect(modelCalled).toBe(false);
    expect(events).toContainEqual({ type: "error", message: "Prompt blocked by policy" });
  });
});
