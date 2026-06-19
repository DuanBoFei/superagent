import { describe, expect, it, vi } from "vitest";
import { createCopyToClipboard } from "../../../packages/web/src/hooks/use-copy-to-clipboard";

describe("createCopyToClipboard", () => {
  it("copies text, reports copied state, and resets after 2 seconds", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const copy = createCopyToClipboard({
      writeText,
      scheduleReset: (callback) => setTimeout(callback, 2000),
      clearReset: clearTimeout,
    });

    await copy.copy("const answer = 42;");

    expect(writeText).toHaveBeenCalledWith("const answer = 42;");
    expect(copy.getState()).toEqual({ copied: true, error: undefined });

    vi.advanceTimersByTime(2000);

    expect(copy.getState()).toEqual({ copied: false, error: undefined });
    vi.useRealTimers();
  });

  it("reports clipboard errors and calls the error callback", async () => {
    const error = new Error("permission denied");
    const onError = vi.fn();
    const copy = createCopyToClipboard({
      writeText: vi.fn().mockRejectedValue(error),
      scheduleReset: (callback) => setTimeout(callback, 2000),
      clearReset: clearTimeout,
      onError,
    });

    await expect(copy.copy("secret")).rejects.toThrow("permission denied");

    expect(copy.getState()).toEqual({ copied: false, error });
    expect(onError).toHaveBeenCalledWith(error);
  });
});
