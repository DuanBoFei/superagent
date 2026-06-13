import { composePrompt as realCompose } from "../../context/composer";
import type { PromptContext, ContextMessage } from "../../context/types";
import type { Message, Prompt } from "../types";

const defaults: PromptContext = {
  rulesFilePath: "CLAUDE.md",
  toolDefinitions: [],
  contextWindowTokens: 128_000,
  currentTokens: 0,
};

export function composePrompt(messages: Message[]): Prompt {
  const now = Date.now();
  const ctxMessages: ContextMessage[] = messages.map((m, i) => ({
    ...m,
    timestamp: now - (messages.length - 1 - i) * 1000,
  }));

  const result = realCompose(ctxMessages, defaults);

  return {
    system: result.system,
    messages: result.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };
}
