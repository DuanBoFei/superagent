import { Message, Prompt } from "../types";

export function composePrompt(messages: Message[]): Prompt {
  console.debug("[STUB] composePrompt called");
  return {
    system: "You are a helpful coding assistant.",
    messages,
  };
}
