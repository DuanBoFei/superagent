import { describe, expect, it } from "vitest";
import { BrowserSessionManager } from "../../src/browser/session";
import type { BrowserAdapter, BrowserAdapterSession } from "../../src/browser/playwright-adapter";
import type { BrowserProfile } from "../../src/browser/types";
import type { LogEvent } from "../../src/observability/types";
import { createToolDispatcher } from "../../src/runtime/tool-dispatcher";
import { createBrowserTool, browserToolSchema } from "../../src/tools/browser";
import { readTool, readToolSchema } from "../../src/tools/read";
import { createToolRegistry, registerTool } from "../../src/tools/registry";

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

class FullChainBrowserAdapter implements BrowserAdapter {
  readonly session: BrowserAdapterSession = { id: "session-1" };
  readonly calls: string[] = [];

  async checkAvailability() {
    return { available: true as const, browserName: "chromium" as const, version: "fake" };
  }

  async launch(input: BrowserProfile) {
    this.calls.push(`launch:${input.viewport.width}x${input.viewport.height}`);
    return this.session;
  }

  async close(session: BrowserAdapterSession) {
    this.calls.push(`close:${session.id}`);
  }

  async navigate(session: BrowserAdapterSession, url: string, timeoutMs: number) {
    this.calls.push(`navigate:${session.id}:${url}:${timeoutMs}`);
  }

  async getPageState(session: BrowserAdapterSession, maxTextChars: number) {
    this.calls.push(`getPageState:${session.id}:${maxTextChars}`);
    return {
      finalUrl: "https://example.test/final?token=secret-value",
      title: "Example",
      visibleText: "Dashboard token=secret-value",
    };
  }

  async screenshot() {
    return new Uint8Array([1, 2, 3]);
  }

  async click(session: BrowserAdapterSession, selector: string, timeoutMs: number) {
    this.calls.push(`click:${session.id}:${selector}:${timeoutMs}`);
  }

  async typeText() {}
  async select() {}
  async wait() {}
}

describe("browser full-chain runtime dispatch", () => {
  it("approves a browser tool call, emits redacted events, and continues with a non-browser tool", async () => {
    const adapter = new FullChainBrowserAdapter();
    const events: LogEvent[] = [];
    const permissionChecks: string[] = [];
    const registry = createToolRegistry();
    registerTool(
      registry,
      "Browser",
      createBrowserTool({ profile: profile(), sessions: new BrowserSessionManager(adapter), emit: (event) => events.push(event) }),
      browserToolSchema,
      false,
    );
    registerTool(registry, "Read", readTool, readToolSchema, true);

    const dispatcher = createToolDispatcher({
      registry,
      permission: {
        async checkPermission(toolName) {
          permissionChecks.push(toolName);
          return "approved";
        },
      },
      toolContext: { workingDirectory: process.cwd() },
    });

    const results = await dispatcher.dispatchTools([
      { name: "Browser", args: { action: { type: "open", url: "https://example.test?token=secret-value", timeoutMs: 10000 } } },
      { name: "Read", args: { file_path: "package.json", limit: 1 } },
      { name: "Browser", args: { action: { type: "click", selector: "button.save", timeoutMs: 10000 } } },
    ]);

    expect(results).toHaveLength(3);
    expect(JSON.parse(results[0]!.output)).toMatchObject({
      action: "open",
      status: "running",
      finalUrl: "https://example.test/final?token=[REDACTED]",
      textSummary: "Dashboard token=[REDACTED]",
    });
    expect(results[1]).toMatchObject({ name: "Read", success: true });
    expect(results[1]!.output).toContain("1\t{");
    expect(JSON.parse(results[2]!.output)).toMatchObject({ action: "click", status: "running" });
    expect(permissionChecks).toEqual(["Read", "Browser", "Browser"]);
    expect(adapter.calls).toEqual(expect.arrayContaining([
      "launch:1280x720",
      "navigate:session-1:https://example.test?token=secret-value:10000",
      "click:session-1:button.save:10000",
    ]));
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "browser:start", action: "open", urlSummary: "https://example.test?token=[REDACTED]" }),
      expect.objectContaining({ type: "browser:action", action: "open", urlSummary: "https://example.test/final?token=[REDACTED]", textSummary: "Dashboard token=[REDACTED]" }),
      expect.objectContaining({ type: "browser:end", action: "open", success: true }),
      expect.objectContaining({ type: "browser:start", action: "click" }),
      expect.objectContaining({ type: "browser:end", action: "click", success: true }),
    ]));
    expect(JSON.stringify(events)).not.toContain("secret-value");
  });
});
