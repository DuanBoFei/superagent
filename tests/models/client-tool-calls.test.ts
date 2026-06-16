import { describe, expect, it } from "vitest";
import { parseSSEStream } from "../../src/models/client";
import type { TokenChunk } from "../../src/models/types";

function responseFromChunks(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
  );
}

async function collect(response: Response): Promise<TokenChunk[]> {
  const chunks: TokenChunk[] = [];
  for await (const chunk of parseSSEStream(response)) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("parseSSEStream tool calls", () => {
  it("yields a tool_use chunk from a complete delta.tool_calls chunk", async () => {
    const response = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"tool_calls":[{"id":"call_1","index":0,"function":{"name":"Read","arguments":"{\\\"file_path\\\":\\\"src/runtime/runtime.ts\\\"}"}}]}}]}\n\n',
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    await expect(collect(response)).resolves.toEqual([
      {
        type: "tool_use",
        tool_call: {
          name: "Read",
          arguments: { file_path: "src/runtime/runtime.ts" },
        },
        model: "deepseek-v4-pro",
      },
      { type: "end", model: "deepseek-v4-pro", finish_reason: "tool_calls" },
    ]);
  });

  it("accumulates fragmented arguments into one complete tool_use chunk", async () => {
    const response = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"tool_calls":[{"id":"call_1","index":0,"function":{"name":"Read","arguments":"{\\\"file_path\\\":"}}]}}]}\n\n',
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"tool_calls":[{"id":"call_1","index":0,"function":{"arguments":"\\\"src/runtime/runtime.ts\\\"}"}}]}}]}\n\n',
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
    ]);

    await expect(collect(response)).resolves.toEqual([
      {
        type: "tool_use",
        tool_call: {
          name: "Read",
          arguments: { file_path: "src/runtime/runtime.ts" },
        },
        model: "deepseek-v4-pro",
      },
      { type: "end", model: "deepseek-v4-pro", finish_reason: "tool_calls" },
    ]);
  });

  it("preserves provider order for multiple indexed tool calls", async () => {
    const response = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"tool_calls":[{"id":"call_2","index":1,"function":{"name":"Grep","arguments":"{\\\"pattern\\\":\\\"createRuntime\\\"}"}},{"id":"call_1","index":0,"function":{"name":"Read","arguments":"{\\\"file_path\\\":\\\"src/runtime/runtime.ts\\\"}"}}]}}]}\n\n',
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
    ]);

    await expect(collect(response)).resolves.toEqual([
      {
        type: "tool_use",
        tool_call: {
          name: "Read",
          arguments: { file_path: "src/runtime/runtime.ts" },
        },
        model: "deepseek-v4-pro",
      },
      {
        type: "tool_use",
        tool_call: {
          name: "Grep",
          arguments: { pattern: "createRuntime" },
        },
        model: "deepseek-v4-pro",
      },
      { type: "end", model: "deepseek-v4-pro", finish_reason: "tool_calls" },
    ]);
  });

  it("emits an error chunk for malformed structured tool-call JSON", async () => {
    const response = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"tool_calls":[{"id":"call_1","index":0,"function":{"name":"Read","arguments":"{not json"}}]}}]}\n\n',
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
    ]);

    await expect(collect(response)).resolves.toEqual([
      {
        type: "tool_error",
        tool_call: {
          name: "Read",
          arguments: "{not json",
        },
        error: "Invalid tool arguments for Read: {not json",
        model: "deepseek-v4-pro",
      },
      { type: "end", model: "deepseek-v4-pro", finish_reason: "tool_calls" },
    ]);
  });

  it("redacts secret-looking malformed argument previews", async () => {
    const response = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"tool_calls":[{"id":"call_1","index":0,"function":{"name":"Read","arguments":"{\\\"api_key\\\":\\\"sk-test-secret\\\""}}]}}]}\n\n',
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
    ]);

    await expect(collect(response)).resolves.toEqual([
      {
        type: "tool_error",
        tool_call: {
          name: "Read",
          arguments: '{"api_key":"[REDACTED]"',
        },
        error: 'Invalid tool arguments for Read: {"api_key":"[REDACTED]"',
        model: "deepseek-v4-pro",
      },
      { type: "end", model: "deepseek-v4-pro", finish_reason: "tool_calls" },
    ]);
  });

  it("does not leak accumulated tool-call state across streams", async () => {
    const first = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"tool_calls":[{"id":"call_1","index":0,"function":{"name":"Read","arguments":"{\\\"file_path\\\":\\\"a.ts\\\"}"}}]}}]}\n\n',
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
    ]);
    const second = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"tool_calls":[{"id":"call_1","index":0,"function":{"name":"Read","arguments":"{\\\"file_path\\\":\\\"b.ts\\\"}"}}]}}]}\n\n',
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
    ]);

    await expect(collect(first)).resolves.toContainEqual({
      type: "tool_use",
      tool_call: { name: "Read", arguments: { file_path: "a.ts" } },
      model: "deepseek-v4-pro",
    });
    await expect(collect(second)).resolves.toContainEqual({
      type: "tool_use",
      tool_call: { name: "Read", arguments: { file_path: "b.ts" } },
      model: "deepseek-v4-pro",
    });
  });
});
