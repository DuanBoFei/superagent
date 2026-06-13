import { describe, expect, it, vi, beforeEach } from "vitest";
import { createRuntime } from "../../src/runtime/runtime";
import { dispatchEvent } from "../../src/cli/renderer";
import type { TurnEvent, Token } from "../../src/runtime/types";
import type { TerminalConfig } from "../../src/cli/types";

const tty: TerminalConfig = {
  width: 80,
  supportsColor: true,
  isTTY: true,
};

describe("Runtime → Renderer integration", () => {
  let stdout = "";

  beforeEach(() => {
    stdout = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdout +=
        typeof chunk === "string"
          ? chunk
          : new TextDecoder().decode(chunk as Uint8Array);
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  it("full pipeline: text response through dispatchEvent to stdout", async () => {
    async function* stubModel(): AsyncGenerator<Token> {
      yield { type: "text", content: "I found the bug in src/index.ts" };
    }

    const runtime = createRuntime({ sendMessage: stubModel });
    const stream = runtime.startTurn("fix the bug");

    for await (const event of stream) {
      dispatchEvent(event, tty);
    }

    expect(stdout).toContain("I found the bug in src/index.ts");
    expect(stdout).toContain("Turn 1");
  });

  it("full pipeline: tool_call → real tool execution → tool_result → turn_end", async () => {
    let callCount = 0;
    async function* stubModel(): AsyncGenerator<Token> {
      callCount++;
      if (callCount === 1) {
        yield { type: "text", content: "Let me search" };
        yield {
          type: "tool_use",
          name: "Grep",
          arguments: JSON.stringify({ pattern: "import", path: "tests/cli" }),
        };
      } else {
        yield { type: "text", content: "Found the results" };
      }
    }

    const runtime = createRuntime({ sendMessage: stubModel, maxTurns: 3 });
    const stream = runtime.startTurn("search the tests");

    for await (const event of stream) {
      dispatchEvent(event, tty);
    }

    expect(stdout).toContain("Let me search");
    expect(stdout).toContain("[Grep]");
    expect(stdout).toContain("✓ [Grep]");
    expect(stdout).toContain("Turn 2");
  });

  it("turn_end event has correct summary fields", async () => {
    async function* stubModel(): AsyncGenerator<Token> {
      yield { type: "text", content: "OK" };
    }

    const runtime = createRuntime({ sendMessage: stubModel });
    const stream = runtime.startTurn("test");

    const events: TurnEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }

    const turnEnd = events.find((e) => e.type === "turn_end");
    expect(turnEnd).toBeDefined();
    if (turnEnd && turnEnd.type === "turn_end") {
      expect(turnEnd.summary.turnNumber).toBe(1);
      expect(turnEnd.summary.reason).toBe("completed");
    }
  });

  it("session tracks turnNumber across consecutive turns", async () => {
    async function* stubModel(): AsyncGenerator<Token> {
      yield { type: "text", content: "response" };
    }

    const runtime = createRuntime({ sendMessage: stubModel });

    let stream = runtime.startTurn("first");
    for await (const _ of stream) { /* consume */ }
    expect(runtime.getSession().turnNumber).toBe(1);

    stream = runtime.startTurn("second");
    for await (const _ of stream) { /* consume */ }
    expect(runtime.getSession().turnNumber).toBe(2);
  });
});
