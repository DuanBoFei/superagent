import { describe, expect, it, vi } from "vitest";
import { fallbackRequest, resetFallbackState, type ModelRequester } from "../../src/models/fallback";
import { ModelError, type ModelConfig, type ModelToolDefinition, type Prompt, type TokenChunk } from "../../src/models/types";

const prompt: Prompt = {
  system: "You are SuperAgent.",
  messages: [{ role: "user", content: "Hello" }],
};

const primary: ModelConfig = {
  apiKey: "test-key",
  baseUrl: "https://api.example.test/v1",
  model: "deepseek-v4-pro",
  timeout: 120000,
};

const secondary: ModelConfig = {
  apiKey: "test-key",
  baseUrl: "https://api.example.test/v1",
  model: "deepseek-v4-flash",
  timeout: 120000,
};

async function* stream(chunks: TokenChunk[]): AsyncGenerator<TokenChunk> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

async function collect(requester: ModelRequester): Promise<TokenChunk[]> {
  const chunks: TokenChunk[] = [];
  for await (const chunk of fallbackRequest(prompt, primary, secondary, { requester })) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("fallbackRequest", () => {
  it("uses primary only when primary succeeds", async () => {
    resetFallbackState();
    const requester = vi.fn<ModelRequester>().mockImplementation((_prompt, cfg) =>
      stream([{ type: "text", content: "ok", model: cfg.model }]),
    );

    await expect(collect(requester)).resolves.toEqual([
      { type: "text", content: "ok", model: "deepseek-v4-pro" },
    ]);
    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester.mock.calls[0]?.[1].model).toBe("deepseek-v4-pro");
  });

  it("falls back to secondary when primary is exhausted", async () => {
    resetFallbackState();
    const fallbackEvents: Array<{ from: string; to: string; reason: string }> = [];
    const requester = vi.fn<ModelRequester>().mockImplementation((_prompt, cfg) => {
      if (cfg.model === "deepseek-v4-pro") {
        throw new ModelError("HTTP_ERROR", "Primary unavailable", { status: 503 });
      }
      return stream([{ type: "text", content: "ok", model: cfg.model }]);
    });

    const chunks: TokenChunk[] = [];
    for await (const chunk of fallbackRequest(prompt, primary, secondary, {
      requester,
      onFallback: (event) => fallbackEvents.push(event),
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { type: "text", content: "ok", model: "deepseek-v4-flash" },
    ]);
    expect(requester).toHaveBeenCalledTimes(3);
    expect(fallbackEvents).toEqual([
      {
        from: "deepseek-v4-pro",
        to: "deepseek-v4-flash",
        reason: "Primary unavailable",
      },
    ]);
  });

  it("throws ModelError with both errors when both models fail", async () => {
    resetFallbackState();
    const requester = vi.fn<ModelRequester>().mockImplementation((_prompt, cfg) => {
      throw new ModelError("HTTP_ERROR", `${cfg.model} unavailable`, { status: 503 });
    });

    await expect(collect(requester)).rejects.toMatchObject({
      code: "ALL_MODELS_UNAVAILABLE",
      message: expect.stringContaining("deepseek-v4-pro"),
      errors: [expect.any(ModelError), expect.any(ModelError)],
    });
    expect(requester).toHaveBeenCalledTimes(4);
  });

  it("preserves tools in fallback request when primary fails", async () => {
    resetFallbackState();
    const tools: ModelToolDefinition[] = [
      {
        type: "function",
        function: {
          name: "Read",
          description: "Read a file",
          parameters: { type: "object", properties: { file_path: { type: "string" } } },
        },
      },
    ];
    const promptWithTools: Prompt = {
      system: "You are SuperAgent.",
      messages: [{ role: "user", content: "Read the file" }],
      tools,
    };

    let fallbackPromptTools: ModelToolDefinition[] | undefined;
    const requester = vi.fn<ModelRequester>().mockImplementation((_prompt, cfg) => {
      if (cfg.model === "deepseek-v4-pro") {
        throw new ModelError("HTTP_ERROR", "Primary unavailable", { status: 503 });
      }
      fallbackPromptTools = _prompt.tools;
      return stream([{ type: "text", content: "ok", model: cfg.model }]);
    });

    const chunks: TokenChunk[] = [];
    for await (const chunk of fallbackRequest(promptWithTools, primary, secondary, { requester })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ type: "text", content: "ok", model: "deepseek-v4-flash" }]);
    expect(fallbackPromptTools).toEqual(tools);
  });

  it("skips primary after three consecutive primary timeouts", async () => {
    resetFallbackState();
    const requester = vi.fn<ModelRequester>().mockImplementation((_prompt, cfg) => {
      if (cfg.model === "deepseek-v4-pro") {
        throw new ModelError("TIMEOUT", "Primary timed out");
      }
      return stream([{ type: "text", content: "ok", model: cfg.model }]);
    });

    await collect(requester);
    await collect(requester);
    await collect(requester);
    requester.mockClear();

    await expect(collect(requester)).resolves.toEqual([
      { type: "text", content: "ok", model: "deepseek-v4-flash" },
    ]);
    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester.mock.calls[0]?.[1].model).toBe("deepseek-v4-flash");
  });
});
