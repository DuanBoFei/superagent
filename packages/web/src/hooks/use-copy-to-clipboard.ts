export interface CopyToClipboardState {
  copied: boolean;
  error?: Error;
}

export interface CopyToClipboardOptions {
  writeText?: (text: string) => Promise<void>;
  scheduleReset?: (callback: () => void) => unknown;
  clearReset?: (handle: unknown) => void;
  onCopied?: () => void;
  onError?: (error: Error) => void;
}

export interface CopyToClipboardController {
  copy(text: string): Promise<void>;
  reset(): void;
  getState(): CopyToClipboardState;
}

const RESET_DELAY_MS = 2000;

export function createCopyToClipboard(options: CopyToClipboardOptions = {}): CopyToClipboardController {
  let copied = false;
  let error: Error | undefined;
  let resetHandle: unknown;

  const writeText = options.writeText ?? ((text: string) => navigator.clipboard.writeText(text));
  const scheduleReset = options.scheduleReset ?? ((callback: () => void) => setTimeout(callback, RESET_DELAY_MS));
  const clearReset = options.clearReset ?? clearTimeout;

  const clearPendingReset = () => {
    if (resetHandle !== undefined) {
      clearReset(resetHandle);
      resetHandle = undefined;
    }
  };

  const reset = () => {
    copied = false;
    error = undefined;
    resetHandle = undefined;
  };

  return {
    copy: async (text) => {
      clearPendingReset();
      try {
        await writeText(text);
        copied = true;
        error = undefined;
        options.onCopied?.();
        resetHandle = scheduleReset(reset);
      } catch (caught) {
        copied = false;
        error = caught instanceof Error ? caught : new Error(String(caught));
        options.onError?.(error);
        throw error;
      }
    },
    reset: () => {
      clearPendingReset();
      reset();
    },
    getState: () => ({ copied, error }),
  };
}

export function useCopyToClipboard(options: CopyToClipboardOptions = {}): CopyToClipboardController {
  return createCopyToClipboard(options);
}
