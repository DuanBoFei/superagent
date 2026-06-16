import { normalizeBrowserError, redactBrowserSecrets, type BrowserFailureReason } from "./errors";
import type { BrowserAction, BrowserArtifact, BrowserResult } from "./types";

const MAX_TEXT_CHARS = 12000;

export interface BrowserPageState {
  finalUrl?: string;
  title?: string;
  visibleText?: string;
  actionTrace?: string;
  artifacts?: BrowserArtifact[];
}

export interface NormalizeBrowserResultInput {
  action: BrowserAction["type"];
  pageState?: BrowserPageState;
  failure?: {
    reason: BrowserFailureReason;
    detail: string;
  };
  timedOut?: boolean;
  durationMs: number;
}

export function safeBrowserText(value: string, maxChars = MAX_TEXT_CHARS): string {
  const redacted = redactBrowserSecrets(value);
  if (redacted.length <= maxChars) {
    return redacted;
  }
  return `${redacted.slice(0, maxChars)}\n[truncated]`;
}

export function normalizeBrowserResult(input: NormalizeBrowserResultInput): BrowserResult {
  const timedOut = input.timedOut === true;
  const failed = input.failure !== undefined;

  return {
    action: input.action,
    status: timedOut ? "timed_out" : failed ? "failed" : "running",
    ...(input.pageState?.finalUrl !== undefined ? { finalUrl: safeBrowserText(input.pageState.finalUrl) } : {}),
    ...(input.pageState?.title !== undefined ? { title: safeBrowserText(input.pageState.title) } : {}),
    ...(input.pageState?.visibleText !== undefined ? { textSummary: safeBrowserText(input.pageState.visibleText) } : {}),
    ...(input.pageState?.actionTrace !== undefined ? { actionTrace: safeBrowserText(input.pageState.actionTrace) } : {}),
    artifacts: input.pageState?.artifacts ?? [],
    timedOut,
    durationMs: input.durationMs,
    ...(input.failure !== undefined
      ? { safeError: normalizeBrowserError(input.failure.reason, input.failure.detail) }
      : {}),
  };
}
