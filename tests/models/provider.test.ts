import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMessage } from "../../src/models/provider";
import type { Prompt, TokenChunk } from "../../src/models/types";

const prompt: Prompt = {
  system: "You are SuperAgent.",
  messages: [{ role: "user", content: "Hello" }],
};

function sseResponse(model: string, content: string): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            `data: {"model":"${model}","choices":[{"delta":{"content":"${content}"}}]}\n\n`,
          ),
        );
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

describe("sendMessage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reads config and streams chunks from the primary model", async () => {
    vi.stubEnv("SUPERAGENT_API_KEY", "test-key");
    vi.stubEnv("SUPERAGENT_BASE_URL", "https://api.example.test/v1");
    vi.stubEnv("SUPERAGENT_MODEL", "deepseek-v4-pro");
    vi.stubEnv("SUPERAGENT_FALLBACK_MODEL", "deepseek-v4-flash");

    const fetchMock = vi.fn().mockResolvedValue(sseResponse("deepseek-v4-pro", "ok"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(collect()).resolves.toEqual([
      { type: "text", content: "ok", model: "deepseek-v4-pro" },
      { type: "end" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.test/v1/chat/completions");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      model: "deepseek-v4-pro",
      stream: true,
      messages: [
        { role: "system", content: "You are SuperAgent." },
        { role: "user", content: "Hello" },
      ],
    });
  });
});
