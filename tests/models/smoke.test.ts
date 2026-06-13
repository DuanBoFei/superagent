import { describe, expect, it } from "vitest";
import { sendMessage } from "../../src/models/provider";
import type { Prompt, TokenChunk } from "../../src/models/types";

async function collect(prompt: Prompt): Promise<TokenChunk[]> {
  const chunks: TokenChunk[] = [];
  for await (const chunk of sendMessage(prompt)) {
    chunks.push(chunk);
  }
  return chunks;
}

describe.skip("real model API smoke", () => {
  it("streams a non-empty response with token usage", async () => {
    const chunks = await collect({
      system: "You are SuperAgent.",
      messages: [{ role: "user", content: "Hello" }],
    });

    const text = chunks
      .filter((chunk): chunk is Extract<TokenChunk, { type: "text" }> => chunk.type === "text")
      .map((chunk) => chunk.content)
      .join("");
    const end = chunks.find(
      (chunk): chunk is Extract<TokenChunk, { type: "end" }> => chunk.type === "end",
    );

    expect(process.env.SUPERAGENT_API_KEY).toBeTruthy();
    expect(text.length).toBeGreaterThan(0);
    expect(end?.usage?.input_tokens).toBeGreaterThan(0);
  });
});
