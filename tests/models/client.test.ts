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

describe("parseSSEStream", () => {
  it("yields text chunks from content deltas", async () => {
    const response = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"content":"Hel"}}]}\n\n',
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"content":"lo"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    await expect(collect(response)).resolves.toEqual([
      { type: "text", content: "Hel", model: "deepseek-v4-pro" },
      { type: "text", content: "lo", model: "deepseek-v4-pro" },
      { type: "end" },
    ]);
  });

  it("yields tool_use chunks from tool call deltas", async () => {
    const response = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"tool_calls":[{"function":{"name":"Read","arguments":"{\\\"file_path\\\":\\\"src/index.ts\\\"}"}}]}}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    await expect(collect(response)).resolves.toEqual([
      {
        type: "tool_use",
        tool_call: {
          name: "Read",
          arguments: { file_path: "src/index.ts" },
        },
        model: "deepseek-v4-pro",
      },
      { type: "end" },
    ]);
  });

  it("yields final usage and finish reason from completion chunks", async () => {
    const response = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":7,"completion_tokens":3}}\n\n',
      "data: [DONE]\n\n",
    ]);

    await expect(collect(response)).resolves.toEqual([
      {
        type: "end",
        usage: { input_tokens: 7, output_tokens: 3 },
        model: "deepseek-v4-pro",
        finish_reason: "stop",
      },
    ]);
  });

  it("reassembles data lines split across stream reads", async () => {
    const response = responseFromChunks([
      'data: {"model":"deepseek-v4-pro","choices":[{"delta":{"content":"Hel',
      'lo"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    await expect(collect(response)).resolves.toEqual([
      { type: "text", content: "Hello", model: "deepseek-v4-pro" },
      { type: "end" },
    ]);
  });

  it("skips malformed JSON data lines and continues", async () => {
    const response = responseFromChunks([
      "data: {not json}\n\n",
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);

    await expect(collect(response)).resolves.toEqual([
      { type: "text", content: "ok" },
      { type: "end" },
    ]);
  });
});
