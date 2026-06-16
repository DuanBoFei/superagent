import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMessage } from "../../src/models/provider";
import type { ModelToolDefinition, Prompt, TokenChunk } from "../../src/models/types";

const readTool: ModelToolDefinition = {
  type: "function",
  function: {
    name: "Read",
    description: "Read a file",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string" },
      },
      required: ["file_path"],
      additionalProperties: false,
    },
  },
};

const prompt: Prompt = {
  system: "You are SuperAgent.",
  messages: [{ role: "user", content: "Read src/index.ts" }],
  tools: [readTool],
};

function sseResponse(): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    }),
    { status: 200 },
  );
}

async function collect(): Promise<TokenChunk[]> {
  const chunks: TokenChunk[] = [];
  for await (const chunk of sendMessage(prompt)) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("provider tool request body", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends tools and tool_choice auto when tools are available", async () => {
    vi.stubEnv("SUPERAGENT_API_KEY", "test-key");
    vi.stubEnv("SUPERAGENT_BASE_URL", "https://api.example.test/v1");
    vi.stubEnv("SUPERAGENT_MODEL", "deepseek-v4-pro");
    vi.stubEnv("SUPERAGENT_FALLBACK_MODEL", "deepseek-v4-flash");

    const fetchMock = vi.fn().mockResolvedValue(sseResponse());
    vi.stubGlobal("fetch", fetchMock);

    await expect(collect()).resolves.toEqual([{ type: "end" }]);

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "deepseek-v4-pro",
      stream: true,
      tools: [readTool],
      tool_choice: "auto",
    });
  });
});
