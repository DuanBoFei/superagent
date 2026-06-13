import { ModelError } from "./types";

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  timeout?: number;
  onRetry?: (attempt: number, error: ModelError, delayMs: number) => void;
}

export async function withRetry<T>(
  fn: (signal?: AbortSignal) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const errors: ModelError[] = [];
  let attempt = 0;

  while (true) {
    const controller = options.timeout ? new AbortController() : undefined;
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined;

    try {
      return await fn(controller?.signal);
    } catch (err) {
      const error = toModelError(err);
      errors.push(error);

      const delayMs = retryDelay(error, errors);
      if (delayMs === null || attempt >= options.maxRetries) {
        if (errors.length > 1) {
          throw new ModelError("RETRY_EXHAUSTED", "Retry attempts exhausted", {
            errors,
          });
        }
        throw error;
      }

      attempt++;
      options.onRetry?.(attempt, error, delayMs);
      await delay(delayMs);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }
}

function retryDelay(error: ModelError, errors: ModelError[]): number | null {
  if (error.status === 400 || error.status === 401 || error.status === 403) {
    return null;
  }

  if (error.status === 429) {
    if (errors.filter((candidate) => candidate.status === 429).length >= 4) {
      return null;
    }
    return retryAfterMs(error.headers) ?? 0;
  }

  if (error.status !== undefined && error.status >= 500) {
    if (errors.filter((candidate) => candidate.status !== undefined && candidate.status >= 500).length >= 2) {
      return null;
    }
    return 2000;
  }

  if (error.code === "TIMEOUT") {
    if (errors.filter((candidate) => candidate.code === "TIMEOUT").length >= 2) {
      return null;
    }
    return 0;
  }

  return null;
}

function retryAfterMs(headers: Headers | undefined): number | null {
  const retryAfter = headers?.get("Retry-After");
  if (!retryAfter) {
    return null;
  }

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(retryAfter);
  if (Number.isNaN(dateMs)) {
    return null;
  }

  return Math.max(0, dateMs - Date.now());
}

function toModelError(err: unknown): ModelError {
  if (err instanceof ModelError) {
    return err;
  }

  if (err instanceof DOMException && err.name === "AbortError") {
    return new ModelError("TIMEOUT", "Model request timed out");
  }

  if (err instanceof Error) {
    return new ModelError("UNKNOWN", err.message);
  }

  return new ModelError("UNKNOWN", "Unknown model error");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
