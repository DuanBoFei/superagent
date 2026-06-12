import { Token, TurnEvent } from "./types";

export async function* parseStream(
  stream: AsyncGenerator<Token>,
): AsyncGenerator<TurnEvent> {
  let textBuffer = "";

  for await (const token of stream) {
    if (token.type === "text") {
      textBuffer += token.content ?? "";
    } else if (token.type === "tool_use") {
      if (textBuffer.length > 0) {
        yield { type: "text", content: textBuffer };
        textBuffer = "";
      }
      yield parseToolCall(token);
    }
  }

  if (textBuffer.length > 0) {
    yield { type: "text", content: textBuffer };
  }
}

function parseToolCall(token: Token): TurnEvent {
  try {
    const args = JSON.parse(token.arguments ?? "{}") as Record<string, unknown>;
    return {
      type: "tool_call",
      name: token.name ?? "unknown",
      args,
    };
  } catch {
    return {
      type: "error",
      message: `Invalid tool arguments for ${token.name ?? "unknown tool"}: ${token.arguments ?? "(empty)"}`,
    };
  }
}
