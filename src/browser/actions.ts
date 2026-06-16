import { createScreenshotArtifact, type BrowserArtifactWriter } from "./artifacts";
import { normalizeBrowserResult } from "./results";
import { BrowserSessionManager } from "./session";
import type { BrowserAction, BrowserProfile, BrowserResult } from "./types";

const MAX_PAGE_TEXT_CHARS = 12000;

export interface ExecuteBrowserActionInput {
  action: BrowserAction;
  profile: BrowserProfile;
  sessions: BrowserSessionManager;
  artifactWriter?: BrowserArtifactWriter;
  now?: Date;
}

export async function executeBrowserAction(input: ExecuteBrowserActionInput): Promise<BrowserResult> {
  const startedAt = Date.now();
  const start = await input.sessions.start(input.profile);
  if (!start.ok) {
    return normalizeBrowserResult({
      action: input.action.type,
      failure: { reason: "setup_failed", detail: start.safeError },
      durationMs: elapsed(startedAt),
    });
  }

  try {
    if (input.action.type !== "open" && input.action.type !== "screenshot") {
      return normalizeBrowserResult({
        action: input.action.type,
        failure: { reason: "action_failed", detail: `Unsupported browser action: ${input.action.type}` },
        durationMs: elapsed(startedAt),
      });
    }

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
        return normalizeBrowserResult({
          action: "open",
          pageState,
          durationMs: elapsed(startedAt),
        });
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
          return normalizeBrowserResult({
            action: "screenshot",
            failure: { reason: "setup_failed", detail: artifact.safeError },
            durationMs: elapsed(startedAt),
          });
        }
        const pageState = await input.sessions.adapter.getPageState(start.adapterSession, MAX_PAGE_TEXT_CHARS);
        return normalizeBrowserResult({
          action: "screenshot",
          pageState: { ...pageState, artifacts: [artifact.artifact] },
          durationMs: elapsed(startedAt),
        });
      }
    }
  } catch (error) {
    const timedOut = error instanceof Error && error.message === "browser_action_timeout";
    return normalizeBrowserResult({
      action: input.action.type,
      failure: {
        reason: timedOut ? "timeout" : input.action.type === "open" ? "navigation_failed" : "action_failed",
        detail: timedOut ? `action exceeded timeout` : error instanceof Error ? error.message : String(error),
      },
      timedOut,
      durationMs: elapsed(startedAt),
    });
  }
}

function elapsed(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
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
