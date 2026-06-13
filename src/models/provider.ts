import { getConfig } from "../config/config";
import { parseSSEStream } from "./client";
import { fallbackRequest, type ModelRequester } from "./fallback";
import { ModelError, type ModelConfig, type Prompt, type TokenChunk } from "./types";

export async function* sendMessage(prompt: Prompt): AsyncGenerator<TokenChunk> {
  const { config } = getConfig();
  const primary: ModelConfig = {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
    timeout: 120000,
  };
  const secondary: ModelConfig = {
    apiKey: config.apiKey,
    baseUrl: config.fallbackBaseUrl || config.baseUrl,
    model: config.fallbackModel,
    timeout: 120000,
  };

  yield* fallbackRequest(prompt, primary, secondary, { requester: requestModel });
}

const requestModel: ModelRequester = async function* (
  prompt,
  config,
  signal,
): AsyncGenerator<TokenChunk> {
  const response = await fetch(chatCompletionsUrl(config.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      messages: [{ role: "system", content: prompt.system }, ...prompt.messages],
    }),
    signal,
  });

  if (!response.ok) {
    throw new ModelError("HTTP_ERROR", `HTTP ${response.status}`, {
      status: response.status,
      headers: response.headers,
    });
  }

  yield* parseSSEStream(response);
};

function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}
