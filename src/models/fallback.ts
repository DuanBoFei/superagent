import { classifyError } from "./fallback-policy";
import { withRetry } from "./retry";
import { ModelError, type ModelConfig, type Prompt, type TokenChunk } from "./types";

export type ModelRequester = (
  prompt: Prompt,
  config: ModelConfig,
  signal?: AbortSignal,
) => AsyncGenerator<TokenChunk>;

export interface FallbackEvent {
  from: string;
  to: string;
  reason: string;
}

export interface ModelAttemptEvent {
  model: string;
  attempt: number;
  category?: string;
}

export interface FallbackOptions {
  requester: ModelRequester;
  onFallback?: (event: FallbackEvent) => void;
  onAttemptStart?: (event: ModelAttemptEvent) => void;
  onAttemptEnd?: (event: ModelAttemptEvent & { durationMs: number; success: boolean; errorCategory?: string }) => void;
}

let primaryTimeouts = 0;
let skipPrimary = false;

export function resetFallbackState(): void {
  primaryTimeouts = 0;
  skipPrimary = false;
}

export async function* fallbackRequest(
  prompt: Prompt,
  primaryCfg: ModelConfig,
  secondaryCfg: ModelConfig,
  options: FallbackOptions,
): AsyncGenerator<TokenChunk> {
  let primaryError: ModelError | undefined;

  if (!skipPrimary) {
    const primaryStart = Date.now();
    options.onAttemptStart?.({ model: primaryCfg.model, attempt: primaryTimeouts + 1 });
    try {
      yield* yieldChunks(requestWithRetry(prompt, primaryCfg, options.requester));
      primaryTimeouts = 0;
      options.onAttemptEnd?.({
        model: primaryCfg.model,
        attempt: 1,
        durationMs: Date.now() - primaryStart,
        success: true,
      });
      return;
    } catch (err) {
      primaryError = primaryFailure(toModelError(err));
      const category = classifyError(primaryError);
      options.onAttemptEnd?.({
        model: primaryCfg.model,
        attempt: primaryTimeouts + 1,
        durationMs: Date.now() - primaryStart,
        success: false,
        errorCategory: category,
      });
      if (category === "client_error" || category === "auth_error") {
        throw primaryError;
      }
      if (isTimeoutError(primaryError)) {
        primaryTimeouts++;
        if (primaryTimeouts >= 3) {
          skipPrimary = true;
        }
      } else {
        primaryTimeouts = 0;
      }
    }
  }

  options.onFallback?.({
    from: primaryCfg.model,
    to: secondaryCfg.model,
    reason: primaryError?.message ?? "Primary skipped",
  });

  const fallbackStart = Date.now();
  options.onAttemptStart?.({ model: secondaryCfg.model, attempt: 1, category: "fallback" });
  try {
    yield* yieldChunks(requestWithRetry(prompt, secondaryCfg, options.requester));
    options.onAttemptEnd?.({
      model: secondaryCfg.model,
      attempt: 1,
      durationMs: Date.now() - fallbackStart,
      success: true,
      errorCategory: "fallback",
    });
  } catch (err) {
    const secondaryError = toModelError(err);
    const category = classifyError(secondaryError);
    options.onAttemptEnd?.({
      model: secondaryCfg.model,
      attempt: 1,
      durationMs: Date.now() - fallbackStart,
      success: false,
      errorCategory: category,
    });
    throw new ModelError(
      "ALL_MODELS_UNAVAILABLE",
      `All models unavailable: ${primaryCfg.model}: ${primaryError?.message ?? "skipped"}; ${secondaryCfg.model}: ${secondaryError.message}`,
      { errors: primaryError ? [primaryError, secondaryError] : [secondaryError] },
    );
  }
}

async function* yieldChunks(
  chunksPromise: Promise<TokenChunk[]>,
): AsyncGenerator<TokenChunk> {
  for (const chunk of await chunksPromise) {
    yield chunk;
  }
}

async function requestWithRetry(
  prompt: Prompt,
  config: ModelConfig,
  requester: ModelRequester,
): Promise<TokenChunk[]> {
  return withRetry(
    async (signal) => {
      const chunks: TokenChunk[] = [];
      for await (const chunk of requester(prompt, config, signal)) {
        chunks.push(chunk);
      }
      return chunks;
    },
    { maxRetries: 3, baseDelay: 2000, timeout: config.timeout },
  );
}

function primaryFailure(error: ModelError): ModelError {
  const first = error.errors?.[0];
  return first instanceof ModelError ? first : error;
}

function isTimeoutError(error: ModelError): boolean {
  return (
    error.code === "TIMEOUT" ||
    error.errors?.every(
      (cause) => cause instanceof ModelError && cause.code === "TIMEOUT",
    ) === true
  );
}

function toModelError(err: unknown): ModelError {
  if (err instanceof ModelError) {
    return err;
  }

  if (err instanceof Error) {
    return new ModelError("UNKNOWN", err.message);
  }

  return new ModelError("UNKNOWN", "Unknown model error");
}
