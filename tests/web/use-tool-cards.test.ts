import { describe, expect, it, vi } from "vitest";
import { createToolCardDispatcher } from "../../packages/web/src/hooks/use-tool-cards";
import { createCardsSlice } from "../../packages/web/src/store/slices/cards.slice";
import type { CardsSlice } from "../../packages/web/src/store/slices/cards.slice";

function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
}

describe("tool card event dispatcher", () => {
  let cards: CardsSlice;
  let dispatch: ReturnType<typeof createToolCardDispatcher>;

  beforeEach(() => {
    cards = createCardsSlice(createStorage());
    dispatch = createToolCardDispatcher(cards);
  });

  it("creates card on tool_start event", () => {
    dispatch.dispatchToolStart({
      toolCallId: "call_1",
      toolName: "Bash",
      title: "ls -la",
      timestamp: 1_700_000_000_000,
    });

    const card = cards.getCard("call_1");
    expect(card).toBeDefined();
    expect(card!.type).toBe("bash");
    expect(card!.status).toBe("running");
    expect(card!.title).toBe("ls -la");
  });

  it("maps tool names to card types", () => {
    const cases: [string, string][] = [
      ["Read", "file-read"],
      ["Write", "file-write"],
      ["Edit", "file-edit"],
      ["Grep", "grep"],
      ["Glob", "glob"],
      ["Task", "task-list"],
      ["Bash", "bash"],
      ["SubAgent", "sub-agent-grid"],
      ["WebSearch", "web-search"],
    ];

    for (const [toolName, expectedType] of cases) {
      const id = `call_${toolName}`;
      dispatch.dispatchToolStart({ toolCallId: id, toolName, title: toolName, timestamp: 1 });
      expect(cards.getCard(id)!.type).toBe(expectedType);
    }
  });

  it("appends output on tool_output event for bash cards", () => {
    dispatch.dispatchToolStart({ toolCallId: "call_bash", toolName: "Bash", title: "test", timestamp: 1 });
    dispatch.dispatchToolOutput({ toolCallId: "call_bash", content: "line 1\n" });
    dispatch.dispatchToolOutput({ toolCallId: "call_bash", content: "line 2\n" });

    const card = cards.getCard("call_bash");
    expect(card!.content.output).toBe("line 1\nline 2\n");
  });

  it("updates card status to success on tool_complete", () => {
    dispatch.dispatchToolStart({ toolCallId: "call_1", toolName: "Bash", title: "test", timestamp: 1 });
    dispatch.dispatchToolComplete({ toolCallId: "call_1", status: "success" });

    const card = cards.getCard("call_1");
    expect(card!.status).toBe("success");
  });

  it("updates card status to error on tool_complete with error status", () => {
    dispatch.dispatchToolStart({ toolCallId: "call_err", toolName: "Bash", title: "fail", timestamp: 1 });
    dispatch.dispatchToolComplete({
      toolCallId: "call_err",
      status: "error",
      errorType: "CommandError",
      errorMessage: "command not found",
    });

    const card = cards.getCard("call_err");
    expect(card!.status).toBe("error");
  });

  it("updates card status to error on tool_error", () => {
    dispatch.dispatchToolStart({ toolCallId: "call_fatal", toolName: "Bash", title: "die", timestamp: 1 });
    dispatch.dispatchToolError({
      toolCallId: "call_fatal",
      errorType: "FatalError",
      message: "process crashed",
      stackTrace: "Error: crash\n    at process (index.js:1)",
    });

    const card = cards.getCard("call_fatal");
    expect(card!.status).toBe("error");
  });

  it("gracefully ignores invalid payloads without crashing", () => {
    expect(() => dispatch.dispatchToolStart(null)).not.toThrow();
    expect(() => dispatch.dispatchToolStart({})).not.toThrow();
    expect(() => dispatch.dispatchToolStart({ toolCallId: 123, toolName: null })).not.toThrow();
    expect(() => dispatch.dispatchToolOutput({ toolCallId: "no_such_card", content: "x" })).not.toThrow();
  });

  it("gracefully handles tool_output for unknown card (no crash)", () => {
    expect(() => {
      dispatch.dispatchToolOutput({ toolCallId: "nonexistent", content: "ghost" });
    }).not.toThrow();
  });

  it("maps unknown tool names to bash type as fallback", () => {
    dispatch.dispatchToolStart({ toolCallId: "call_unknown", toolName: "UnknownTool", title: "???", timestamp: 1 });
    const card = cards.getCard("call_unknown");
    expect(card).toBeDefined();
    expect(card!.type).toBe("bash");
  });
});
