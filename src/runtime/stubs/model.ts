import { sendMessage as sendProviderMessage } from "../../models/provider";
import type { TokenChunk } from "../../models/types";
import type { Prompt, Token } from "../types";

export async function* sendMessage(prompt: Prompt): AsyncGenerator<Token> {
  for await (const chunk of sendProviderMessage(prompt)) {
    const token = toRuntimeToken(chunk);
    if (token) {
      yield token;
    }
  }
}

function toRuntimeToken(chunk: TokenChunk): Token | null {
  if (chunk.type === "text") {
    return { type: "text", content: chunk.content };
  }

  if (chunk.type === "tool_use") {
    return {
      type: "tool_use",
      name: chunk.tool_call.name,
      arguments: JSON.stringify(chunk.tool_call.arguments),
    };
  }

  if (chunk.type === "tool_error") {
    return {
      type: "error",
      name: chunk.tool_call.name,
      error: chunk.error,
    };
  }

  return null;
}
