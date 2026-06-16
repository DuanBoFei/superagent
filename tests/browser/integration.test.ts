import { describe, expect, it } from "vitest";
import { executeBrowserAction } from "../../src/browser/actions";
import type { BrowserAdapter, BrowserAdapterSession } from "../../src/browser/playwright-adapter";
import { BrowserSessionManager } from "../../src/browser/session";
import type { BrowserProfile } from "../../src/browser/types";
import { createBrowserTool } from "../../src/tools/browser";
import { createToolRegistry, registerTool } from "../../src/tools/registry";
import { createScheduler } from "../../src/scheduling/scheduler";
import { readToolSchema } from "../../src/tools/read";
import type { ToolFunction } from "../../src/tools/types";
import type { LogEvent } from "../../src/observability/types";

function profile(overrides: Partial<BrowserProfile> = {}): BrowserProfile {
  return {
    enabled: true,
    headless: true,
    defaultTimeoutMs: 30000,
    artifactDir: "artifacts",
    viewport: { width: 1280, height: 720 },
    network: "enabled",
    captureScreenshots: true,
    ...overrides,
  };
}

class FakeBrowserAdapter implements BrowserAdapter {
  readonly session: BrowserAdapterSession = { id: "session-1" };
  readonly calls: string[] = [];
  launchError: Error | undefined;
  navigateDelayMs = 0;
  visibleText = "token=secret-value";

  async checkAvailability() {
    return { available: true as const, browserName: "chromium" as const, version: "fake" };
  }

  async launch(input: BrowserProfile) {
    this.calls.push(`launch:${input.viewport.width}x${input.viewport.height}`);
    if (this.launchError !== undefined) {
      throw this.launchError;
    }
    return this.session;
  }

  async close(session: BrowserAdapterSession) {
    this.calls.push(`close:${session.id}`);
  }

  async navigate(session: BrowserAdapterSession, url: string, timeoutMs: number) {
    this.calls.push(`navigate:${session.id}:${url}:${timeoutMs}`);
    if (this.navigateDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.navigateDelayMs));
    }
  }

  async getPageState(session: BrowserAdapterSession, maxTextChars: number) {
    this.calls.push(`getPageState:${session.id}:${maxTextChars}`);
    return {
      finalUrl: "https://example.test/final?api_key=secret-value",
      title: "Example",
      visibleText: this.visibleText,
    };
  }

  async screenshot() {
    return new Uint8Array([1, 2, 3]);
  }

  async click(session: BrowserAdapterSession, selector: string, timeoutMs: number) {
    this.calls.push(`click:${session.id}:${selector}:${timeoutMs}`);
  }

  async typeText(session: BrowserAdapterSession, selector: string, text: string, timeoutMs: number) {
    this.calls.push(`typeText:${session.id}:${selector}:${text}:${timeoutMs}`);
  }

  async select() {}

  async wait() {}
}

describe("browser integration", () => {
  it("emits redacted browser lifecycle events for open and interaction actions", async () => {
    const adapter = new FakeBrowserAdapter();
    const events: LogEvent[] = [];
    const sessions = new BrowserSessionManager(adapter);

    const openResult = await executeBrowserAction({
      action: { type: "open", url: "https://example.test?api_key=secret-value", timeoutMs: 10000 },
      profile: profile(),
      sessions,
      emit: (event) => events.push(event),
    });
    const typeResult = await executeBrowserAction({
      action: { type: "type", selector: "input[name=token]", text: "token=secret-value", timeoutMs: 10000 },
      profile: profile(),
      sessions,
      emit: (event) => events.push(event),
    });

    expect(openResult).toMatchObject({ action: "open", status: "running", textSummary: "token=[REDACTED]" });
    expect(typeResult.actionTrace).toBe("typed into input[name=token]: token=[REDACTED]");
    expect(events).toEqual([
      expect.objectContaining({ type: "browser:start", action: "open", urlSummary: "https://example.test?api_key=[REDACTED]" }),
      expect.objectContaining({ type: "browser:action", action: "open", status: "running", urlSummary: "https://example.test/final?api_key=[REDACTED]", textSummary: "token=[REDACTED]" }),
      expect.objectContaining({ type: "browser:end", action: "open", status: "running", success: true }),
      expect.objectContaining({ type: "browser:start", action: "type", inputSummary: "token=[REDACTED]" }),
      expect.objectContaining({ type: "browser:action", action: "type", status: "running", textSummary: "token=[REDACTED]", inputSummary: "token=[REDACTED]" }),
      expect.objectContaining({ type: "browser:end", action: "type", status: "running", success: true }),
    ]);
    expect(JSON.stringify(events)).not.toContain("secret-value");
  });

  it("emits failure events for unavailable setup and returns a safe result", async () => {
    const adapter = new FakeBrowserAdapter();
    adapter.launchError = new Error("launch token=secret-value failed");
    const events: LogEvent[] = [];

    const result = await executeBrowserAction({
      action: { type: "open", url: "https://example.test", timeoutMs: 10000 },
      profile: profile(),
      sessions: new BrowserSessionManager(adapter),
      emit: (event) => events.push(event),
    });

    expect(result).toMatchObject({ action: "open", status: "failed", safeError: "Browser setup failed: Browser setup failed: launch token=[REDACTED] failed" });
    expect(events).toEqual([
      expect.objectContaining({ type: "browser:start", action: "open" }),
      expect.objectContaining({ type: "browser:failure", action: "open", safeError: "Browser setup failed: Browser setup failed: launch token=[REDACTED] failed" }),
    ]);
    expect(JSON.stringify(events)).not.toContain("secret-value");
  });

  it("emits timeout failure and keeps non-browser tools usable", async () => {
    const adapter = new FakeBrowserAdapter();
    adapter.navigateDelayMs = 20;
    const events: LogEvent[] = [];
    const registry = createToolRegistry();
    registerTool(
      registry,
      "Browser",
      createBrowserTool({ profile: profile(), sessions: new BrowserSessionManager(adapter), emit: (event) => events.push(event) }),
      readToolSchema,
      false,
    );
    const readTool: ToolFunction = async () => ({ output: "read-ok" });
    registerTool(registry, "Read", readTool, readToolSchema, true);

    const scheduler = createScheduler(registry, {
      async checkPermission() {
        return "approved";
      },
    });
    const results = await scheduler.dispatchTools([
      { id: "browser-1", name: "Browser", args: { action: { type: "open", url: "https://slow.test", timeoutMs: 1 } } },
      { id: "read-1", name: "Read", args: { file_path: "README.md" } },
    ]);

    const browserResult = results.find((result) => result.id === "browser-1");
    const readResult = results.find((result) => result.id === "read-1");
    expect(JSON.parse(browserResult!.output)).toMatchObject({ action: "open", status: "timed_out", timedOut: true });
    expect(readResult).toMatchObject({ id: "read-1", name: "Read", success: true, output: "read-ok" });
    expect(events).toEqual([
      expect.objectContaining({ type: "browser:start", action: "open", urlSummary: "https://slow.test" }),
      expect.objectContaining({ type: "browser:failure", action: "open", timedOut: true }),
    ]);
  });
});
