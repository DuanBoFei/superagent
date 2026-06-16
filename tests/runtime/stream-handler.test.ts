import { describe, expect, it } from "vitest";
import { parseStream } from "../../src/runtime/stream-handler";
import { Token, TurnEvent } from "../../src/runtime/types";

async function collect(stream: AsyncGenerator<TurnEvent>): Promise<TurnEvent[]> {
  const events: TurnEvent[] = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

async function* tokensToStream(
  tokens: Token[],
): AsyncGenerator<Token> {
  for (const token of tokens) {
    yield token;
  }
}

describe("Stream handler", () => {
  it("plain text stream yields text events only", async () => {
    const tokens = tokensToStream([
      { type: "text", content: "Hello " },
      { type: "text", content: "World!" },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events.length).toBe(1);
    expect(events[0]).toEqual({ type: "text", content: "Hello World!" });
  });

  it("tool call stream yields tool_call events with parsed args", async () => {
    const tokens = tokensToStream([
      {
        type: "tool_use",
        name: "Read",
        arguments: '{"file_path": "/src/main.ts"}',
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events.length).toBe(1);
    expect(events[0]).toEqual({
      type: "tool_call",
      name: "Read",
      args: { file_path: "/src/main.ts" },
    });
  });

  it("mixed stream yields text then tool_call events", async () => {
    const tokens = tokensToStream([
      { type: "text", content: "Let me read the file." },
      {
        type: "tool_use",
        name: "Read",
        arguments: '{"file_path": "/src/main.ts"}',
      },
      { type: "text", content: "Now let me write." },
      {
        type: "tool_use",
        name: "Write",
        arguments: '{"file_path": "/out.txt", "content": "done"}',
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events.length).toBe(4);
    expect(events[0]).toEqual({
      type: "text",
      content: "Let me read the file.",
    });
    expect(events[1]).toEqual({
      type: "tool_call",
      name: "Read",
      args: { file_path: "/src/main.ts" },
    });
    expect(events[2]).toEqual({
      type: "text",
      content: "Now let me write.",
    });
    expect(events[3]).toEqual({
      type: "tool_call",
      name: "Write",
      args: { file_path: "/out.txt", content: "done" },
    });
  });

  it("does not dispatch fallback markup before a structured tool call", async () => {
    const tokens = tokensToStream([
      {
        type: "text",
        content: "Ignore this fallback markup: <tool><name>Read</name><parameter name=\"file_path\">wrong.ts</parameter></tool>",
      },
      {
        type: "tool_use",
        name: "Read",
        arguments: '{"file_path":"right.ts"}',
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events).toEqual([
      {
        type: "text",
        content: "Ignore this fallback markup: <tool><name>Read</name><parameter name=\"file_path\">wrong.ts</parameter></tool>",
      },
      {
        type: "tool_call",
        name: "Read",
        args: { file_path: "right.ts" },
      },
    ]);
  });

  it("DSML text tool calls yield tool_call events with normalized args", async () => {
    const tokens = tokensToStream([
      {
        type: "text",
        content: "Let me read the file.\n\n<｜｜DSML｜｜tool_calls>\n<｜｜DSML｜｜invoke name=\"Read\">\n<｜｜DSML｜｜parameter name=\"filePath\" string=\"true\">src/runtime/runtime.ts</｜｜DSML｜｜parameter>\n</｜｜DSML｜｜invoke>\n</｜｜DSML｜｜tool_calls>",
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events).toEqual([
      { type: "text", content: "Let me read the file.\n\n" },
      { type: "tool_call", name: "Read", args: { file_path: "src/runtime/runtime.ts" } },
    ]);
  });

  it("bash text tool calls yield Bash tool_call events", async () => {
    const tokens = tokensToStream([
      {
        type: "text",
        content: "Let me read the file first.\n\n<bash>cat src/runtime/runtime.ts</bash>",
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events).toEqual([
      { type: "text", content: "Let me read the file first.\n\n" },
      { type: "tool_call", name: "Bash", args: { command: "cat src/runtime/runtime.ts" } },
    ]);
  });

  it("XML function tool calls yield tool_call events with normalized args", async () => {
    const tokens = tokensToStream([
      {
        type: "text",
        content: "Let me read the file first.\n\n<tool>\n<tool_call>\n<function name=\"Read\">\n<parameter name=\"filePath\" string=\"true\">/Users/blue/Coding/projects/superagent/superagent/src/runtime/runtime.ts</parameter>\n</function>\n</tool_call>",
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events).toEqual([
      { type: "text", content: "Let me read the file first.\n\n" },
      {
        type: "tool_call",
        name: "Read",
        args: { file_path: "/Users/blue/Coding/projects/superagent/superagent/src/runtime/runtime.ts" },
      },
    ]);
  });

  it("function-read tool calls yield Read tool_call events", async () => {
    const tokens = tokensToStream([
      {
        type: "text",
        content: "Let me read the file first.\n\n<function-read>\n<path>src/runtime/runtime.ts</path>\n</function-read>",
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events).toEqual([
      { type: "text", content: "Let me read the file first.\n\n" },
      { type: "tool_call", name: "Read", args: { file_path: "src/runtime/runtime.ts" } },
    ]);
  });

  it("read_file tool calls yield Read tool_call events", async () => {
    const tokens = tokensToStream([
      {
        type: "text",
        content: "Let me read the file first.\n\n<read_file>\n<path>src/runtime/runtime.ts</path>\n</read_file>",
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events).toEqual([
      { type: "text", content: "Let me read the file first.\n\n" },
      { type: "tool_call", name: "Read", args: { file_path: "src/runtime/runtime.ts" } },
    ]);
  });

  it("function-wrap JSON tool calls yield Read tool_call events", async () => {
    const tokens = tokensToStream([
      {
        type: "text",
        content: "Let me read the file first.\n\n<function-wrap>\n{\n  \"function\": \"Read\",\n  \"path\": \"src/runtime/runtime.ts\"\n}\n</function-wrap>",
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events).toEqual([
      { type: "text", content: "Let me read the file first.\n\n" },
      { type: "tool_call", name: "Read", args: { file_path: "src/runtime/runtime.ts" } },
    ]);
  });

  it("goals read entries yield Read tool_call events", async () => {
    const tokens = tokensToStream([
      {
        type: "text",
        content: "Let me read the file first.\n\n<goals>\n1. Read src/runtime/runtime.ts\n2. Understand createRuntime's purpose\n</goals>",
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events).toEqual([
      { type: "text", content: "Let me read the file first.\n\n" },
      { type: "tool_call", name: "Read", args: { file_path: "src/runtime/runtime.ts" } },
    ]);
  });

  it("named tool_call XML yields tool_call events", async () => {
    const tokens = tokensToStream([
      {
        type: "text",
        content: "<tool_call name=\"Read\">\n<file_path>src/runtime/runtime.ts</file_path>\n</tool_call>",
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events).toEqual([
      { type: "tool_call", name: "Read", args: { file_path: "src/runtime/runtime.ts" } },
    ]);
  });

  it("named tool XML yields tool_call events", async () => {
    const tokens = tokensToStream([
      {
        type: "text",
        content: "Let me read the file.\n\n<tool>\n<name>Read</name>\n<parameter name=\"file_path\">src/runtime/runtime.ts</parameter>\n</tool>",
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events).toEqual([
      { type: "text", content: "Let me read the file.\n\n" },
      { type: "tool_call", name: "Read", args: { file_path: "src/runtime/runtime.ts" } },
    ]);
  });

  it("malformed tool JSON yields error event (not crash)", async () => {
    const tokens = tokensToStream([
      {
        type: "tool_use",
        name: "Read",
        arguments: "{not valid json",
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe("error");
    expect((events[0] as { type: "error"; message: string }).message).toContain(
      "Invalid tool arguments",
    );
  });

  it("error token from model parser yields error TurnEvent", async () => {
    const tokens = tokensToStream([
      {
        type: "error",
        name: "Read",
        error: 'Invalid tool arguments for Read: {"api_key":"[REDACTED]"',
      },
    ]);
    const events = await collect(parseStream(tokens));

    expect(events.length).toBe(1);
    expect(events[0]).toEqual({
      type: "error",
      message: 'Invalid tool arguments for Read: {"api_key":"[REDACTED]"',
    });
  });

  it("empty stream yields no events", async () => {
    const tokens = tokensToStream([]);
    const events = await collect(parseStream(tokens));
    expect(events.length).toBe(0);
  });
});
