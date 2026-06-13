import type { TokenChunk, TokenUsage } from "./types";

type OpenAIStreamChunk = {
  model?: string;
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
};

type ParsedSSELine =
  | { kind: "chunk"; chunk: TokenChunk }
  | { kind: "done" }
  | null;

export async function* parseSSEStream(
  response: Response,
): AsyncGenerator<TokenChunk> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let emittedEnd = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const parsed = parseSSELine(line);
        if (parsed?.kind === "chunk") {
          if (parsed.chunk.type === "end") {
            emittedEnd = true;
          }
          yield parsed.chunk;
        } else if (parsed?.kind === "done" && !emittedEnd) {
          emittedEnd = true;
          yield { type: "end" };
        }
      }
    }

    buffer += decoder.decode();
    for (const line of buffer.split(/\r?\n/)) {
      const parsed = parseSSELine(line);
      if (parsed?.kind === "chunk") {
        if (parsed.chunk.type === "end") {
          emittedEnd = true;
        }
        yield parsed.chunk;
      } else if (parsed?.kind === "done" && !emittedEnd) {
        emittedEnd = true;
        yield { type: "end" };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSSELine(line: string): ParsedSSELine {
  if (!line.startsWith("data:")) {
    return null;
  }

  const data = line.slice("data:".length).trim();
  if (data.length === 0) {
    return null;
  }
  if (data === "[DONE]") {
    return { kind: "done" };
  }

  let parsed: OpenAIStreamChunk;
  try {
    parsed = JSON.parse(data) as OpenAIStreamChunk;
  } catch {
    return null;
  }

  const choice = parsed.choices?.[0];
  const content = choice?.delta?.content;
  if (content !== undefined) {
    return { kind: "chunk", chunk: { type: "text", content, model: parsed.model } };
  }

  const toolCall = choice?.delta?.tool_calls?.[0];
  if (toolCall?.function?.name) {
    return {
      kind: "chunk",
      chunk: {
        type: "tool_use",
        tool_call: {
          name: toolCall.function.name,
          arguments: parseToolArguments(toolCall.function.arguments),
        },
        model: parsed.model,
      },
    };
  }

  if (parsed.usage || choice?.finish_reason) {
    return {
      kind: "chunk",
      chunk: {
        type: "end",
        usage: parsed.usage ? parseUsage(parsed.usage) : undefined,
        model: parsed.model,
        finish_reason: choice?.finish_reason,
      },
    };
  }

  return null;
}

function parseToolArguments(args: string | undefined): Record<string, unknown> {
  if (!args) {
    return {};
  }

  try {
    return JSON.parse(args) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseUsage(usage: NonNullable<OpenAIStreamChunk["usage"]>): TokenUsage {
  return {
    input_tokens: usage.input_tokens ?? usage.prompt_tokens ?? 0,
    output_tokens: usage.output_tokens ?? usage.completion_tokens ?? 0,
  };
}
