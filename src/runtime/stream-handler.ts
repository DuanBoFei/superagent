import { Token, TurnEvent } from "./types";

export async function* parseStream(
  stream: AsyncGenerator<Token>,
): AsyncGenerator<TurnEvent> {
  let textBuffer = "";

  function* flushTextBuffer(parseFallback = true): Generator<TurnEvent> {
    if (!parseFallback) {
      if (textBuffer.length > 0) {
        yield { type: "text", content: textBuffer };
      }
      textBuffer = "";
      return;
    }

    const events = parseTextToolCalls(textBuffer);
    if (events.length > 0) {
      for (const event of events) {
        yield event;
      }
    } else if (textBuffer.length > 0) {
      yield { type: "text", content: textBuffer };
    }
    textBuffer = "";
  }

  for await (const token of stream) {
    if (token.type === "text") {
      textBuffer += token.content ?? "";
    } else if (token.type === "tool_use") {
      yield* flushTextBuffer(false);
      yield parseToolCall(token);
    } else if (token.type === "error") {
      yield* flushTextBuffer(false);
      yield { type: "error", message: token.error };
    }
  }

  yield* flushTextBuffer();
}

function parseToolCall(token: Extract<Token, { type: "tool_use" }>): TurnEvent {
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

function parseTextToolCalls(content: string): TurnEvent[] {
  return parseToolMarkup(content, [
    {
      pattern: /<｜｜DSML｜｜tool_calls>([\s\S]*?)<\/｜｜DSML｜｜tool_calls>/g,
      parse: (body) => parseDsmlInvokes(body),
    },
    {
      pattern: /<bash>([\s\S]*?)<\/bash>/g,
      parse: (body) => [{ type: "tool_call", name: "Bash", args: { command: body.trim() } }],
    },
    {
      pattern: /<tool>\s*<tool_call>\s*<function\s+name="([^"]+)">([\s\S]*?)<\/function>\s*<\/tool_call>\s*/g,
      parse: (body, name) => [{ type: "tool_call", name, args: parseXmlParameters(body) }],
    },
    {
      pattern: /<tool_call\s+name="([^"]+)">([\s\S]*?)<\/tool_call>/g,
      parse: (body, name) => [{ type: "tool_call", name, args: parseSimpleToolCallArgs(body) }],
    },
    {
      pattern: /<tool>\s*<name>([\s\S]*?)<\/name>([\s\S]*?)<\/tool>/g,
      parse: (body, name) => [{ type: "tool_call", name: name.trim(), args: parseXmlParameters(body) }],
    },
    {
      pattern: /<function-read>\s*<path>([\s\S]*?)<\/path>\s*<\/function-read>/g,
      parse: (body) => [{ type: "tool_call", name: "Read", args: { file_path: body.trim() } }],
    },
    {
      pattern: /<read_file>\s*<path>([\s\S]*?)<\/path>\s*<\/read_file>/g,
      parse: (body) => [{ type: "tool_call", name: "Read", args: { file_path: body.trim() } }],
    },
    {
      pattern: /<function-wrap>\s*([\s\S]*?)\s*<\/function-wrap>/g,
      parse: (body) => parseFunctionWrap(body),
    },
    {
      pattern: /<goals>([\s\S]*?)<\/goals>/g,
      parse: (body) => parseGoals(body),
    },
  ]);
}

function parseToolMarkup(
  content: string,
  parsers: Array<{ pattern: RegExp; parse: (body: string, name: string) => TurnEvent[] }>,
): TurnEvent[] {
  const matches = parsers.flatMap((parser) => {
    const found: Array<{ index: number; end: number; events: TurnEvent[] }> = [];
    let match: RegExpExecArray | null;

    while ((match = parser.pattern.exec(content)) !== null) {
      found.push({
        index: match.index,
        end: match.index + match[0].length,
        events: parser.parse(match[2] ?? match[1] ?? "", match[1] ?? ""),
      });
    }

    return found;
  }).sort((a, b) => a.index - b.index);

  if (matches.length === 0) {
    return [];
  }

  const events: TurnEvent[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.index < cursor) {
      continue;
    }

    if (match.index > cursor) {
      const text = content.slice(cursor, match.index);
      if (text.length > 0) {
        events.push({ type: "text", content: text });
      }
    }

    events.push(...match.events);
    cursor = match.end;
  }

  if (cursor < content.length) {
    const text = content.slice(cursor);
    if (text.length > 0) {
      events.push({ type: "text", content: text });
    }
  }

  return events;
}

function parseFunctionWrap(content: string): TurnEvent[] {
  try {
    const parsed = JSON.parse(content) as { function?: string; path?: string; args?: Record<string, unknown> };
    if (parsed.function === "Read" && typeof parsed.path === "string") {
      return [{ type: "tool_call", name: "Read", args: { file_path: parsed.path } }];
    }
    if (parsed.function) {
      return [{ type: "tool_call", name: parsed.function, args: parsed.args ?? {} }];
    }
  } catch {
    return [];
  }

  return [];
}

function parseGoals(content: string): TurnEvent[] {
  const events: TurnEvent[] = [];
  const readPattern = /(?:^|\n)\s*\d+\.\s*Read\s+([^\n]+?)(?:\s*$|\n)/g;
  let match: RegExpExecArray | null;

  while ((match = readPattern.exec(content)) !== null) {
    const filePath = (match[1] ?? "").trim();
    if (filePath.length > 0 && !filePath.includes(" ")) {
      events.push({ type: "tool_call", name: "Read", args: { file_path: filePath } });
    }
  }

  return events;
}

function parseDsmlInvokes(content: string): TurnEvent[] {
  const invokePattern = /<｜｜DSML｜｜invoke\s+name="([^"]+)">([\s\S]*?)<\/｜｜DSML｜｜invoke>/g;
  const events: TurnEvent[] = [];
  let match: RegExpExecArray | null;

  while ((match = invokePattern.exec(content)) !== null) {
    events.push({
      type: "tool_call",
      name: match[1] ?? "unknown",
      args: parseDsmlParameters(match[2] ?? ""),
    });
  }

  return events;
}

function parseDsmlParameters(content: string): Record<string, unknown> {
  const parameterPattern = /<｜｜DSML｜｜parameter\s+name="([^"]+)"(?:\s+string="true")?>([\s\S]*?)<\/｜｜DSML｜｜parameter>/g;
  return parseParameterMatches(content, parameterPattern);
}

function parseXmlParameters(content: string): Record<string, unknown> {
  const parameterPattern = /<parameter\s+name="([^"]+)"(?:\s+string="true")?>([\s\S]*?)<\/parameter>/g;
  const args = parseParameterMatches(content, parameterPattern);
  return Object.keys(args).length > 0 ? args : parseSimpleToolCallArgs(content);
}

function parseSimpleToolCallArgs(content: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const tagPattern = /<([a-zA-Z_][\w-]*)>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(content)) !== null) {
    args[normalizeArgumentName(match[1] ?? "")] = (match[2] ?? "").trim();
  }

  return args;
}

function parseParameterMatches(content: string, pattern: RegExp): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    args[normalizeArgumentName(match[1] ?? "")] = match[2] ?? "";
  }

  return args;
}

function normalizeArgumentName(name: string): string {
  if (name === "filePath") return "file_path";
  return name;
}
