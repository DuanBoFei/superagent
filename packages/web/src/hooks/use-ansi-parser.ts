import { createAnsiParser, type AnsiParser } from "../lib/ansi-parser";

export type { AnsiParser };

export function useAnsiParser(): AnsiParser {
  return createAnsiParser();
}
