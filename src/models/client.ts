import type { TokenChunk, TokenUsage } from "./types";

type OpenAIStreamChunk = {
  model?: string;
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        id?: string;
        index?: number;
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

type ToolCallAccumulator = {
  index: number;
  id?: string;
  name?: string;
  arguments: string;
  model?: string;
};

type ParsedSSELine =
  | { kind: "chunks"; chunks: TokenChunk[] }
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
  const toolCalls = new Map<number, ToolCallAccumulator>();

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
        const parsed = parseSSELine(line, toolCalls);
        if (parsed?.kind === "chunks") {
          for (const chunk of parsed.chunks) {
            if (chunk.type === "end") {
              emittedEnd = true;
            }
            yield chunk;
          }
        } else if (parsed?.kind === "done" && !emittedEnd) {
          const chunks = flushToolCalls(toolCalls);
          for (const chunk of chunks) {
            yield chunk;
          }
          emittedEnd = true;
          yield { type: "end" };
        }
      }
    }

    buffer += decoder.decode();
    for (const line of buffer.split(/\r?\n/)) {
      const parsed = parseSSELine(line, toolCalls);
      if (parsed?.kind === "chunks") {
        for (const chunk of parsed.chunks) {
          if (chunk.type === "end") {
            emittedEnd = true;
          }
          yield chunk;
        }
      } else if (parsed?.kind === "done" && !emittedEnd) {
        const chunks = flushToolCalls(toolCalls);
        for (const chunk of chunks) {
          yield chunk;
        }
        emittedEnd = true;
        yield { type: "end" };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSSELine(
  line: string,
  toolCalls: Map<number, ToolCallAccumulator>,
): ParsedSSELine {
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

  const chunks: TokenChunk[] = [];
  const choice = parsed.choices?.[0];
  const content = choice?.delta?.content;
  if (content !== undefined) {
    chunks.push({ type: "text", content, model: parsed.model });
  }

  for (const toolCall of choice?.delta?.tool_calls ?? []) {
    const index = toolCall.index ?? 0;
    const entry = toolCalls.get(index) ?? { index, arguments: "" };
    entry.id = toolCall.id ?? entry.id;
    entry.name = toolCall.function?.name ?? entry.name;
    entry.arguments += toolCall.function?.arguments ?? "";
    entry.model = parsed.model ?? entry.model;
    toolCalls.set(index, entry);
  }

  if (parsed.usage || choice?.finish_reason) {
    chunks.push(...flushToolCalls(toolCalls, parsed.model));
    chunks.push({
      type: "end",
      ...(parsed.usage ? { usage: parseUsage(parsed.usage) } : {}),
      model: parsed.model,
      finish_reason: choice?.finish_reason,
    });
  }

  return chunks.length > 0 ? { kind: "chunks", chunks } : null;
}

function flushToolCalls(
  toolCalls: Map<number, ToolCallAccumulator>,
  model?: string,
): TokenChunk[] {
  const chunks = Array.from(toolCalls.values())
    .sort((left, right) => left.index - right.index)
    .map((toolCall) => buildToolCallChunk(toolCall, model ?? toolCall.model));
  toolCalls.clear();
  return chunks;
}

function buildToolCallChunk(
  toolCall: ToolCallAccumulator,
  model?: string,
): TokenChunk {
  const name = toolCall.name ?? "unknown";
  try {
    return {
      type: "tool_use",
      tool_call: {
        name,
        arguments: toolCall.arguments ? (JSON.parse(toolCall.arguments) as Record<string, unknown>) : {},
      },
      model,
    };
  } catch {
    const argumentsPreview = redactToolArgumentsPreview(toolCall.arguments);
    return {
      type: "tool_error",
      tool_call: {
        name,
        arguments: argumentsPreview,
      },
      error: `Invalid tool arguments for ${name}: ${argumentsPreview}`,
      model,
    };
  }
}

function redactToolArgumentsPreview(preview: string): string {
  return preview.replace(/("?(?:api[_-]?key|authorization|token|secret)"?\s*[:=]\s*")([^"\s,}]+)/gi, "$1[REDACTED]");
}

function parseUsage(usage: NonNullable<OpenAIStreamChunk["usage"]>): TokenUsage {
  return {
    input_tokens: usage.input_tokens ?? usage.prompt_tokens ?? 0,
    output_tokens: usage.output_tokens ?? usage.completion_tokens ?? 0,
  };
}
