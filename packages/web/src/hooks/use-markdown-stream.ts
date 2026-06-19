import { parseMarkdown, parsePartial } from "../lib/markdown/parser";
import type { StreamState } from "../types/markdown";

export interface MarkdownStreamController {
  appendToken(token: string): StreamState;
  finish(): StreamState;
  reset(): StreamState;
  getState(): StreamState;
}

const EMPTY_STATE: StreamState = {
  rawContent: "",
  ast: [],
  partialStructure: "none",
};

export function createMarkdownStream(initialContent = ""): MarkdownStreamController {
  let state = initialContent ? parseContent(initialContent) : EMPTY_STATE;

  return {
    appendToken: (token) => {
      state = parseContent(`${state.rawContent}${token}`);
      return state;
    },
    finish: () => {
      state = {
        rawContent: state.rawContent,
        ast: parseMarkdown(state.rawContent),
        partialStructure: "none",
      };
      return state;
    },
    reset: () => {
      state = EMPTY_STATE;
      return state;
    },
    getState: () => state,
  };
}

export function useMarkdownStream(initialContent = ""): MarkdownStreamController {
  return createMarkdownStream(initialContent);
}

function parseContent(rawContent: string): StreamState {
  const parsed = parsePartial(rawContent);
  return {
    rawContent,
    ast: parsed.ast,
    partialStructure: parsed.partialStructure,
  };
}
