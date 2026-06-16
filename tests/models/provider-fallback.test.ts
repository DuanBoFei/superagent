import { describe, expect, it, vi } from "vitest";
import { classifyError, type ErrorCategory } from "../../src/models/fallback-policy";
import { fallbackRequest, type FallbackEvent, type ModelAttemptEvent, type ModelRequester } from "../../src/models/fallback";
import { ModelError, type ModelConfig, type Prompt, type TokenChunk } from "../../src/models/types";

describe("classifyError", () => {
  // T005: HTTP 429/5xx → retryable categories
  describe("retryable errors", () => {
    it("classifies HTTP 429 as rate_limit", () => {
      const error = new ModelError("HTTP_ERROR", "Rate limited", { status: 429 });
      expect(classifyError(error)).toBe("rate_limit");
    });

    it("classifies HTTP 500 as server_error", () => {
      const error = new ModelError("HTTP_ERROR", "Internal server error", { status: 500 });
      expect(classifyError(error)).toBe("server_error");
    });

    it("classifies HTTP 502 as server_error", () => {
      const error = new ModelError("HTTP_ERROR", "Bad gateway", { status: 502 });
      expect(classifyError(error)).toBe("server_error");
    });

    it("classifies HTTP 503 as server_error", () => {
      const error = new ModelError("HTTP_ERROR", "Service unavailable", { status: 503 });
      expect(classifyError(error)).toBe("server_error");
    });

    it("classifies TIMEOUT code as timeout", () => {
      const error = new ModelError("TIMEOUT", "Request timed out");
      expect(classifyError(error)).toBe("timeout");
    });

    it("classifies AbortError-like DOMException as timeout", () => {
      const domError = new DOMException("The operation was aborted", "AbortError");
      const error = new ModelError("TIMEOUT", domError.message);
      expect(classifyError(error)).toBe("timeout");
    });
  });

  // T006: HTTP 400/401 → terminal categories
  describe("terminal errors", () => {
    it("classifies HTTP 400 as client_error", () => {
      const error = new ModelError("HTTP_ERROR", "Bad request", { status: 400 });
      expect(classifyError(error)).toBe("client_error");
    });

    it("classifies HTTP 401 as auth_error", () => {
      const error = new ModelError("HTTP_ERROR", "Unauthorized", { status: 401 });
      expect(classifyError(error)).toBe("auth_error");
    });

    it("classifies HTTP 403 as auth_error", () => {
      const error = new ModelError("HTTP_ERROR", "Forbidden", { status: 403 });
      expect(classifyError(error)).toBe("auth_error");
    });

    it("classifies HTTP 404 as client_error", () => {
      const error = new ModelError("HTTP_ERROR", "Not found", { status: 404 });
      expect(classifyError(error)).toBe("client_error");
    });
  });

  // T008: network/unknown errors
  describe("network and unknown errors", () => {
    it("classifies fetch failure as network_error", () => {
      const error = new ModelError("NETWORK_ERROR", "fetch failed");
      expect(classifyError(error)).toBe("network_error");
    });

    it("classifies unknown errors as client_error (safe default)", () => {
      const error = new ModelError("UNKNOWN", "Something went wrong");
      expect(classifyError(error)).toBe("client_error");
    });
  });

  // Edge: RETRY_EXHAUSTED wraps multiple causes
  it("classifies based on first cause when RETRY_EXHAUSTED", () => {
    const cause = new ModelError("HTTP_ERROR", "Server error", { status: 503 });
    const error = new ModelError("RETRY_EXHAUSTED", "Retries exhausted", {
      errors: [cause],
    });
    expect(classifyError(error)).toBe("server_error");
  });
});

// T009-T012: Fallback orchestration contract tests
const prompt: Prompt = {
  system: "You are SuperAgent.",
  messages: [{ role: "user", content: "Hello" }],
};

const primary: ModelConfig = {
  apiKey: "test-key",
  baseUrl: "https://api.example.test/v1",
  model: "deepseek-v4-pro",
  timeout: 120000,
};

const secondary: ModelConfig = {
  apiKey: "test-key",
  baseUrl: "https://api.example.test/v1",
  model: "deepseek-v4-flash",
  timeout: 120000,
};

async function* stream(chunks: TokenChunk[]): AsyncGenerator<TokenChunk> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

async function collect(requester: ModelRequester): Promise<TokenChunk[]> {
  const chunks: TokenChunk[] = [];
  for await (const chunk of fallbackRequest(prompt, primary, secondary, { requester })) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("fallback orchestration contract", () => {
  // T009: fallback preserves request body except model id
  it("preserves request body except model id on fallback", async () => {
    let fallbackBody: Record<string, unknown> | undefined;
    let primaryCalled = false;

    const requester = vi.fn<ModelRequester>().mockImplementation(
      async function* (_prompt, cfg) {
        if (cfg.model === "deepseek-v4-pro") {
          primaryCalled = true;
          throw new ModelError("HTTP_ERROR", "Server error", { status: 503 });
        }
        fallbackBody = {
          model: cfg.model,
          messages: _prompt.messages,
          system: _prompt.system,
          tools: _prompt.tools,
        };
        yield { type: "text", content: "ok", model: cfg.model };
      },
    );

    await collect(requester);

    expect(primaryCalled).toBe(true);
    expect(fallbackBody).toEqual({
      model: "deepseek-v4-flash",
      messages: prompt.messages,
      system: prompt.system,
      tools: undefined,
    });
  });

  // T010: successful primary does not call fallback
  it("does not call fallback when primary succeeds", async () => {
    const requester = vi.fn<ModelRequester>().mockImplementation(
      async function* (_prompt, cfg) {
        yield { type: "text", content: "ok", model: cfg.model };
      },
    );

    await expect(collect(requester)).resolves.toEqual([
      { type: "text", content: "ok", model: "deepseek-v4-pro" },
    ]);
    expect(requester).toHaveBeenCalledTimes(1);
  });

  // T012: cap total attempts and emit deterministic failure
  it("throws deterministic error when both models fail", async () => {
    const requester = vi.fn<ModelRequester>().mockImplementation(
      async function* (_prompt, cfg) {
        throw new ModelError("HTTP_ERROR", `${cfg.model} unavailable`, { status: 503 });
      },
    );

    await expect(collect(requester)).rejects.toMatchObject({
      code: "ALL_MODELS_UNAVAILABLE",
      message: expect.stringContaining("deepseek-v4-pro"),
    });
  });

  // T012: non-retryable errors (400) do not trigger fallback
  it("does not fallback on non-retryable client errors (400)", async () => {
    const requester = vi.fn<ModelRequester>().mockImplementation(
      async function* () {
        throw new ModelError("HTTP_ERROR", "Bad request", { status: 400 });
      },
    );

    await expect(collect(requester)).rejects.toBeInstanceOf(ModelError);
    expect(requester).toHaveBeenCalledTimes(1);
  });

  // T013: observability events for fallback trigger
  it("emits attempt start/end and fallback observability events", async () => {
    const attemptStarts: ModelAttemptEvent[] = [];
    const attemptEnds: Array<ModelAttemptEvent & { durationMs: number; success: boolean; errorCategory?: string }> = [];
    const fallbacks: FallbackEvent[] = [];

    const requester = vi.fn<ModelRequester>().mockImplementation(
      async function* (_prompt, cfg) {
        if (cfg.model === "deepseek-v4-pro") {
          throw new ModelError("HTTP_ERROR", "Server error", { status: 503 });
        }
        yield { type: "text", content: "ok", model: cfg.model };
      },
    );

    const chunks: TokenChunk[] = [];
    for await (const chunk of fallbackRequest(prompt, primary, secondary, {
      requester,
      onAttemptStart: (e) => attemptStarts.push(e),
      onAttemptEnd: (e) => attemptEnds.push(e),
      onFallback: (e) => fallbacks.push(e),
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ type: "text", content: "ok", model: "deepseek-v4-flash" }]);

    // Primary attempt
    expect(attemptStarts[0]).toEqual({ model: "deepseek-v4-pro", attempt: 1 });
    expect(attemptEnds[0]).toMatchObject({
      model: "deepseek-v4-pro",
      success: false,
      errorCategory: "server_error",
    });
    expect(typeof attemptEnds[0]?.durationMs).toBe("number");

    // Fallback event
    expect(fallbacks).toEqual([{
      from: "deepseek-v4-pro",
      to: "deepseek-v4-flash",
      reason: "Server error",
    }]);

    // Fallback attempt
    expect(attemptStarts[1]).toEqual({ model: "deepseek-v4-flash", attempt: 1, category: "fallback" });
    expect(attemptEnds[1]).toMatchObject({
      model: "deepseek-v4-flash",
      success: true,
      errorCategory: "fallback",
    });
    expect(typeof attemptEnds[1]?.durationMs).toBe("number");
  });
});
