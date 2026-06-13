import { describe, expect, it, vi } from "vitest";
import { ModelError } from "../../src/models/types";
import { withRetry } from "../../src/models/retry";

function responseError(status: number, headers?: HeadersInit): ModelError {
  const error = new ModelError("HTTP_ERROR", `HTTP ${status}`);
  error.status = status;
  error.headers = new Headers(headers);
  return error;
}

describe("withRetry", () => {
  it("returns result without retry when operation succeeds first try", async () => {
    const operation = vi.fn().mockResolvedValue("ok");
    const onRetry = vi.fn();

    await expect(
      withRetry(operation, { maxRetries: 3, baseDelay: 10, onRetry }),
    ).resolves.toBe("ok");

    expect(operation).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("retries a 503 once after the base delay", async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(responseError(503))
      .mockResolvedValueOnce("ok");
    const onRetry = vi.fn();

    const result = withRetry(operation, { maxRetries: 3, baseDelay: 2000, onRetry });
    await vi.advanceTimersByTimeAsync(2000);

    await expect(result).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({ status: 503 }), 2000);
    vi.useRealTimers();
  });

  it("retries a 429 using Retry-After seconds", async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(responseError(429, { "Retry-After": "3" }))
      .mockResolvedValueOnce("ok");
    const onRetry = vi.fn();

    const result = withRetry(operation, { maxRetries: 3, baseDelay: 2000, onRetry });
    await vi.advanceTimersByTimeAsync(3000);

    await expect(result).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({ status: 429 }), 3000);
    vi.useRealTimers();
  });

  it("throws an exhausted retry error with collected causes", async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(responseError(503))
      .mockRejectedValueOnce(responseError(503));

    const result = withRetry(operation, { maxRetries: 3, baseDelay: 2000 });
    const assertion = expect(result).rejects.toMatchObject({
      code: "RETRY_EXHAUSTED",
      errors: [expect.objectContaining({ status: 503 }), expect.objectContaining({ status: 503 })],
    });
    await vi.advanceTimersByTimeAsync(2000);

    await assertion;
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("throws 401 immediately without retry", async () => {
    const operation = vi.fn().mockRejectedValue(responseError(401));
    const onRetry = vi.fn();

    await expect(
      withRetry(operation, { maxRetries: 3, baseDelay: 10, onRetry }),
    ).rejects.toMatchObject({ status: 401 });

    expect(operation).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });
});
