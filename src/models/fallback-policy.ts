import { ModelError } from "./types";

export type ErrorCategory =
  | "timeout"
  | "network_error"
  | "rate_limit"
  | "server_error"
  | "client_error"
  | "auth_error";

export type FallbackAction =
  | { type: "retry"; delayMs?: number }
  | { type: "fallback" }
  | { type: "fail"; reason: string };

export interface FallbackContext {
  category: ErrorCategory;
  primaryAttempts: number;
  maxPrimaryRetries: number;
  fallbackAvailable: boolean;
}

export function evaluatePolicy(ctx: FallbackContext): FallbackAction {
  switch (ctx.category) {
    case "timeout":
      return ctx.fallbackAvailable
        ? { type: "fallback" }
        : { type: "fail", reason: "Primary timed out and no fallback model available" };

    case "network_error":
      return ctx.fallbackAvailable
        ? { type: "fallback" }
        : { type: "fail", reason: "Primary network error and no fallback model available" };

    case "server_error":
      if (ctx.primaryAttempts < ctx.maxPrimaryRetries) {
        return { type: "retry", delayMs: 2000 };
      }
      return ctx.fallbackAvailable
        ? { type: "fallback" }
        : { type: "fail", reason: "Primary server error retries exhausted and no fallback model available" };

    case "rate_limit":
      if (ctx.primaryAttempts < ctx.maxPrimaryRetries) {
        return { type: "retry", delayMs: 0 };
      }
      return ctx.fallbackAvailable
        ? { type: "fallback" }
        : { type: "fail", reason: "Primary rate limit retries exhausted and no fallback model available" };

    case "client_error":
      return { type: "fail", reason: "Request error — not retrying" };

    case "auth_error":
      return { type: "fail", reason: "Authentication error — check API key" };
  }
}

export function classifyError(error: ModelError): ErrorCategory {
  const cause = error.errors?.[0];
  if (cause instanceof ModelError) {
    return classifyError(cause);
  }

  if (error.status === 429) {
    return "rate_limit";
  }

  if (error.status !== undefined && error.status >= 500) {
    return "server_error";
  }

  if (error.status === 400 || error.status === 404) {
    return "client_error";
  }

  if (error.status === 401 || error.status === 403) {
    return "auth_error";
  }

  if (error.code === "TIMEOUT") {
    return "timeout";
  }

  if (error.code === "NETWORK_ERROR") {
    return "network_error";
  }

  return "client_error";
}
