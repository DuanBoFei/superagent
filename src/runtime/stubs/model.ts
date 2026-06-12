import { Prompt, Token } from "../types";

export async function* sendMessage(prompt: Prompt): AsyncGenerator<Token> {
  console.debug("[STUB] sendMessage called");
  yield { type: "text", content: "This is a stub response." };
}
