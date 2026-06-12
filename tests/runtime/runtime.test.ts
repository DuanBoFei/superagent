import { describe, expect, it } from "vitest";
import { createRuntime } from "../../src/runtime/runtime";
import { TurnEvent } from "../../src/runtime/types";

async function collect(
  stream: AsyncGenerator<TurnEvent>,
): Promise<TurnEvent[]> {
  const events: TurnEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe("Runtime public API", () => {
  it("startTurn yields text from stub model and completes", async () => {
    const runtime = createRuntime();
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
    const runtime = createRuntime();
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

  it("two consecutive turns increments turnNumber", async () => {
    const runtime = createRuntime();

    // Turn 1
    const stream1 = runtime.startTurn("first message");
    await collect(stream1);
    expect(runtime.getSession().turnNumber).toBe(1);

    // Turn 2
    const stream2 = runtime.startTurn("second message");
    await collect(stream2);
    expect(runtime.getSession().turnNumber).toBe(2);
  });
});
