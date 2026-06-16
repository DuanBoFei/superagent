import { createScreenshotArtifact, type BrowserArtifactWriter } from "./artifacts";
import { normalizeBrowserResult, safeBrowserText } from "./results";
import { BrowserSessionManager } from "./session";
import type { LogEvent } from "../observability/types";
import type { BrowserAction, BrowserProfile, BrowserResult } from "./types";

const MAX_PAGE_TEXT_CHARS = 12000;

export interface ExecuteBrowserActionInput {
  action: BrowserAction;
  profile: BrowserProfile;
  sessions: BrowserSessionManager;
  artifactWriter?: BrowserArtifactWriter;
  now?: Date;
  emit?: (event: LogEvent) => void;
}

export async function executeBrowserAction(input: ExecuteBrowserActionInput): Promise<BrowserResult> {
  const startedAt = Date.now();
  const startSummary = actionSummary(input.action);
  input.emit?.({ type: "browser:start", action: input.action.type, ...startSummary });

  if (input.action.type === "close") {
    await input.sessions.close();
    return finalizeBrowserResult(input, normalizeBrowserResult({
      action: "close",
      pageState: { finalUrl: "", title: "", visibleText: "", actionTrace: "closed browser context" },
      durationMs: elapsed(startedAt),
      status: "closed",
    }));
  }

  const start = await input.sessions.start(input.profile);
  if (!start.ok) {
    return finalizeBrowserResult(input, normalizeBrowserResult({
      action: input.action.type,
      failure: { reason: "setup_failed", detail: start.safeError },
      durationMs: elapsed(startedAt),
    }));
  }

  try {
    switch (input.action.type) {
      case "open": {
        const timeoutMs = input.action.timeoutMs ?? input.profile.defaultTimeoutMs;
        const url = input.action.url;
        await withTimeout(
          start.adapterSession.id,
          () => input.sessions.adapter.navigate(start.adapterSession, url, timeoutMs),
          timeoutMs,
        );
        const pageState = await input.sessions.adapter.getPageState(start.adapterSession, MAX_PAGE_TEXT_CHARS);
        input.sessions.markCurrentUrl(pageState.finalUrl);
        return finalizeBrowserResult(input, normalizeBrowserResult({
          action: "open",
          pageState,
          durationMs: elapsed(startedAt),
        }));
      }
      case "screenshot": {
        const bytes = await input.sessions.adapter.screenshot(start.adapterSession, { fullPage: input.action.fullPage });
        const artifact = await createScreenshotArtifact({
          artifactDir: input.profile.artifactDir,
          label: "screenshot",
          content: bytes,
          now: input.now,
          writer: input.artifactWriter,
        });
        if (!artifact.ok) {
          return finalizeBrowserResult(input, normalizeBrowserResult({
            action: "screenshot",
            failure: { reason: "setup_failed", detail: artifact.safeError },
            durationMs: elapsed(startedAt),
          }));
        }
        const pageState = await input.sessions.adapter.getPageState(start.adapterSession, MAX_PAGE_TEXT_CHARS);
        return finalizeBrowserResult(input, normalizeBrowserResult({
          action: "screenshot",
          pageState: { ...pageState, artifacts: [artifact.artifact] },
          durationMs: elapsed(startedAt),
        }));
      }
      case "click": {
        const timeoutMs = input.action.timeoutMs ?? input.profile.defaultTimeoutMs;
        const selector = input.action.selector;
        await withTimeout(
          start.adapterSession.id,
          () => input.sessions.adapter.click(start.adapterSession, selector, timeoutMs),
          timeoutMs,
        );
        const pageState = await input.sessions.adapter.getPageState(start.adapterSession, MAX_PAGE_TEXT_CHARS);
        return finalizeBrowserResult(input, normalizeBrowserResult({
          action: "click",
          pageState: { ...pageState, actionTrace: `clicked ${selector}` },
          durationMs: elapsed(startedAt),
        }));
      }
      case "type": {
        const timeoutMs = input.action.timeoutMs ?? input.profile.defaultTimeoutMs;
        const selector = input.action.selector;
        const text = input.action.text;
        await withTimeout(
          start.adapterSession.id,
          () => input.sessions.adapter.typeText(start.adapterSession, selector, text, timeoutMs),
          timeoutMs,
        );
        const pageState = await input.sessions.adapter.getPageState(start.adapterSession, MAX_PAGE_TEXT_CHARS);
        return finalizeBrowserResult(input, normalizeBrowserResult({
          action: "type",
          pageState: { ...pageState, actionTrace: `typed into ${selector}: ${safeBrowserText(text)}` },
          durationMs: elapsed(startedAt),
        }));
      }
      case "select": {
        const timeoutMs = input.action.timeoutMs ?? input.profile.defaultTimeoutMs;
        const selector = input.action.selector;
        const value = input.action.value;
        await withTimeout(
          start.adapterSession.id,
          () => input.sessions.adapter.select(start.adapterSession, selector, value, timeoutMs),
          timeoutMs,
        );
        const pageState = await input.sessions.adapter.getPageState(start.adapterSession, MAX_PAGE_TEXT_CHARS);
        return finalizeBrowserResult(input, normalizeBrowserResult({
          action: "select",
          pageState: { ...pageState, actionTrace: `selected ${selector}: ${value}` },
          durationMs: elapsed(startedAt),
        }));
      }
      case "wait": {
        const timeoutMs = input.action.timeoutMs ?? input.profile.defaultTimeoutMs;
        const target = input.action;
        await withTimeout(
          start.adapterSession.id,
          () => input.sessions.adapter.wait(start.adapterSession, target, timeoutMs),
          timeoutMs,
        );
        const pageState = await input.sessions.adapter.getPageState(start.adapterSession, MAX_PAGE_TEXT_CHARS);
        return finalizeBrowserResult(input, normalizeBrowserResult({
          action: "wait",
          pageState: { ...pageState, actionTrace: waitTrace(target) },
          durationMs: elapsed(startedAt),
        }));
      }
    }
  } catch (error) {
    const timedOut = error instanceof Error && error.message === "browser_action_timeout";
    return finalizeBrowserResult(input, normalizeBrowserResult({
      action: input.action.type,
      failure: {
        reason: timedOut ? "timeout" : input.action.type === "open" ? "navigation_failed" : "action_failed",
        detail: timedOut ? `action exceeded timeout` : error instanceof Error ? error.message : String(error),
      },
      timedOut,
      durationMs: elapsed(startedAt),
    }));
  }
}

function finalizeBrowserResult(input: ExecuteBrowserActionInput, result: BrowserResult): BrowserResult {
  const summary = resultSummary(input.action, result);
  if (result.safeError !== undefined) {
    input.emit?.({
      type: "browser:failure",
      action: result.action,
      durationMs: result.durationMs,
      timedOut: result.timedOut,
      safeError: result.safeError,
      ...actionSummary(input.action),
    });
    return result;
  }

  input.emit?.({
    type: "browser:action",
    action: result.action,
    status: result.status,
    durationMs: result.durationMs,
    ...summary,
  });
  input.emit?.({
    type: "browser:end",
    action: result.action,
    status: result.status,
    durationMs: result.durationMs,
    success: true,
    timedOut: result.timedOut,
  });
  return result;
}

function actionSummary(action: BrowserAction): { urlSummary?: string; inputSummary?: string } {
  if (action.type === "open") {
    return { urlSummary: safeBrowserText(action.url) };
  }
  if (action.type === "type") {
    return { inputSummary: safeBrowserText(action.text) };
  }
  if (action.type === "select") {
    return { inputSummary: safeBrowserText(action.value) };
  }
  if (action.type === "wait" && action.text !== undefined) {
    return { inputSummary: safeBrowserText(action.text) };
  }
  return {};
}

function resultSummary(action: BrowserAction, result: BrowserResult): { urlSummary?: string; textSummary?: string; inputSummary?: string } {
  return {
    ...actionSummary(action),
    ...(result.finalUrl !== undefined ? { urlSummary: safeBrowserText(result.finalUrl) } : {}),
    ...(result.textSummary !== undefined ? { textSummary: safeBrowserText(result.textSummary) } : {}),
  };
}

function elapsed(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

function waitTrace(action: Extract<BrowserAction, { type: "wait" }>): string {
  const parts: string[] = [];
  if (action.selector !== undefined) {
    parts.push(`selector ${action.selector}`);
  }
  if (action.text !== undefined) {
    parts.push(`text ${action.text}`);
  }
  if (action.loadState !== undefined) {
    parts.push(`load state ${action.loadState}`);
  }
  return `waited for ${parts.join(" and ")}`;
}

async function withTimeout<T>(_id: string, run: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("browser_action_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}
