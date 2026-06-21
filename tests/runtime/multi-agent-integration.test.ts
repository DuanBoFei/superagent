import { describe, expect, it, vi } from "vitest";
import { createRuntime } from "../../src/runtime/runtime";
import type { Token, TurnEvent } from "../../src/runtime/types";

vi.mock("../../src/mcp/manager", () => ({
  createMcpManager: () => ({
    getSessions: () => [],
    listTools: () => [],
    connectAll: async () => {},
    refreshTools: async () => {},
    getSession: () => undefined,
  }),
}));

async function collect(stream: AsyncGenerator<TurnEvent>): Promise<TurnEvent[]> {
  const events: TurnEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe("runtime multi-agent orchestration", () => {
  it("keeps simple prompts on the single-agent query-loop path", async () => {
    const sendMessage = vi.fn(async function* (): AsyncGenerator<Token> {
      yield { type: "text", content: "single response" };
    });
    const runtime = createRuntime({ sendMessage });

    const events = await collect(runtime.startTurn("explain this function"));

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(events.some((event) => event.type === "agent_phase")).toBe(false);
    expect(events).toContainEqual({ type: "text", content: "single response" });
  });

  it("runs Explore, Implement, and Review for forced multi-agent mode", async () => {
    const systems: string[] = [];
    const sendMessage = vi.fn(async function* (prompt): AsyncGenerator<Token> {
      systems.push(prompt.system);
      yield { type: "text", content: `phase ${systems.length}` };
    });
    const emit = vi.fn();
    const runtime = createRuntime({ sendMessage, emit });

    const events = await collect(runtime.startTurn("/multi-agent fix auth"));

    expect(sendMessage).toHaveBeenCalledTimes(3);
    expect(systems[0]).toContain("Explore role");
    expect(systems[1]).toContain("Implement role");
    expect(systems[2]).toContain("Review role");
    expect(events.filter((event) => event.type === "agent_phase").map((event) => event.type === "agent_phase" ? event.role : "")).toEqual([
      "explore",
      "implement",
      "review",
    ]);
    expect(emit).toHaveBeenCalledWith({ type: "agent:phase", runId: expect.any(String), role: "explore", lifecycle: "start" });
    expect(emit).toHaveBeenCalledWith({ type: "agent:phase", runId: expect.any(String), role: "review", lifecycle: "result" });
  });

  it("passes summaries forward without exposing unrestricted phase history to Review", async () => {
    const userPrompts: string[] = [];
    const sendMessage = vi.fn(async function* (prompt): AsyncGenerator<Token> {
      userPrompts.push(prompt.messages.at(-1)?.content ?? "");
      yield { type: "text", content: `summary ${userPrompts.length}` };
    });
    const runtime = createRuntime({ sendMessage });

    await collect(runtime.startTurn("/multi-agent fix auth"));

    expect(userPrompts[1]).toContain("Explore findings:");
    expect(userPrompts[1]).toContain("summary 1");
    expect(userPrompts[2]).toContain("Explore findings:");
    expect(userPrompts[2]).not.toContain("[Tool result:");
    expect(userPrompts[2]).not.toContain("[Tool call:");
  });

  it("maps Review blocking defects to a non-success turn", async () => {
    const sendMessage = vi.fn(async function* (prompt): AsyncGenerator<Token> {
      if (prompt.system.includes("Review role")) {
        yield {
          type: "tool_use",
          name: "ReviewFinding",
          arguments: JSON.stringify({
            category: "correctness",
            description: "Auth regression remains",
            priority: "high",
            blocking: true,
          }),
        };
        return;
      }
      yield { type: "text", content: "phase ok" };
    });
    const runtime = createRuntime({ sendMessage });

    const events = await collect(runtime.startTurn("/multi-agent fix auth"));
    const turnEnd = events.find((event) => event.type === "turn_end");

    expect(turnEnd).toBeDefined();
    if (turnEnd?.type === "turn_end") {
      expect(turnEnd.summary.reason).toBe("error");
    }
    expect(events.some((event) => event.type === "text" && event.content.includes("blocked"))).toBe(true);
  });

  it("skips implementation when Explore produces no findings", async () => {
    const systems: string[] = [];
    const sendMessage = vi.fn(async function* (prompt): AsyncGenerator<Token> {
      systems.push(prompt.system);
      if (prompt.system.includes("Explore role")) {
        yield { type: "text", content: "" };
        return;
      }
      yield { type: "text", content: "should not run" };
    });
    const runtime = createRuntime({ sendMessage });

    const events = await collect(runtime.startTurn("/multi-agent fix auth"));

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(systems[0]).toContain("Explore role");
    expect(events.some((event) => event.type === "text" && event.content.includes("No Explore findings"))).toBe(true);
  });
});
