import { describe, expect, it } from "vitest";
import {
  ModelError,
  type ModelConfig,
  type Prompt,
  type TokenChunk,
} from "../../src/models/types";

describe("model types", () => {
  it("defines prompt and model config contracts", () => {
    const prompt: Prompt = {
      system: "You are SuperAgent.",
      messages: [{ role: "user", content: "Hello" }],
    };

    const config: ModelConfig = {
      apiKey: "test-key",
      baseUrl: "https://api.example.test/v1",
      model: "deepseek-v4-pro",
      timeout: 120000,
    };

    expect(prompt.messages[0]?.content).toBe("Hello");
    expect(config.model).toBe("deepseek-v4-pro");
  });

  it("defines discriminated token chunks", () => {
    const chunks: TokenChunk[] = [
      { type: "text", content: "hello", model: "deepseek-v4-pro" },
      {
        type: "tool_use",
        tool_call: {
          name: "Read",
          arguments: { file_path: "src/index.ts" },
        },
        model: "deepseek-v4-pro",
      },
      {
        type: "end",
        usage: { input_tokens: 10, output_tokens: 5 },
        model: "deepseek-v4-pro",
        finish_reason: "stop",
      },
    ];

    expect(chunks.map((chunk) => chunk.type)).toEqual([
      "text",
      "tool_use",
      "end",
    ]);
  });

  it("creates model errors with stable codes", () => {
    const error = new ModelError("RATE_LIMIT", "Primary model rate limited");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ModelError");
    expect(error.code).toBe("RATE_LIMIT");
    expect(error.message).toBe("Primary model rate limited");
  });
});
