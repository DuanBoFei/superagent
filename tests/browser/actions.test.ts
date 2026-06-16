import { describe, expect, it } from "vitest";
import { executeBrowserAction } from "../../src/browser/actions";
import { BrowserSessionManager } from "../../src/browser/session";
import type { BrowserAdapter, BrowserAdapterSession } from "../../src/browser/playwright-adapter";
import type { BrowserProfile } from "../../src/browser/types";

function profile(overrides: Partial<BrowserProfile> = {}): BrowserProfile {
  return {
    enabled: true,
    headless: true,
    defaultTimeoutMs: 30000,
    artifactDir: "/repo/.superagent/browser-artifacts",
    viewport: { width: 1280, height: 720 },
    network: "enabled",
    captureScreenshots: true,
    ...overrides,
  };
}

class FakeBrowserAdapter implements BrowserAdapter {
  readonly calls: string[] = [];
  readonly session: BrowserAdapterSession = { id: "session-1" };
  navigateDelayMs = 0;

  async checkAvailability() {
    this.calls.push("checkAvailability");
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
    if (this.navigateDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.navigateDelayMs));
    }
  }

  async getPageState(session: BrowserAdapterSession, maxTextChars: number) {
    this.calls.push(`getPageState:${session.id}:${maxTextChars}`);
    return {
      finalUrl: "https://example.test/final",
      title: "Example",
      visibleText: "Hello world",
    };
  }

  async screenshot(session: BrowserAdapterSession, options?: { fullPage?: boolean }) {
    this.calls.push(`screenshot:${session.id}:${options?.fullPage === true}`);
    return new Uint8Array([1, 2, 3]);
  }
}

describe("browser adapter boundary", () => {
  it("checks browser availability", async () => {
    const adapter = new FakeBrowserAdapter();

    await expect(adapter.checkAvailability()).resolves.toEqual({
      available: true,
      browserName: "chromium",
      version: "fake",
    });
    expect(adapter.calls).toEqual(["checkAvailability"]);
  });

  it("launches and closes browser context", async () => {
    const adapter = new FakeBrowserAdapter();
    const session = await adapter.launch(profile());
    await adapter.close(session);

    expect(adapter.calls).toEqual(["launch:1280x720", "close:session-1"]);
  });

  it("navigates to URL", async () => {
    const adapter = new FakeBrowserAdapter();
    const session = await adapter.launch(profile());
    await adapter.navigate(session, "https://example.test", 10000);

    expect(adapter.calls).toContain("navigate:session-1:https://example.test:10000");
  });

  it("reads bounded page state", async () => {
    const adapter = new FakeBrowserAdapter();
    const session = await adapter.launch(profile());

    await expect(adapter.getPageState(session, 12000)).resolves.toEqual({
      finalUrl: "https://example.test/final",
      title: "Example",
      visibleText: "Hello world",
    });
    expect(adapter.calls).toContain("getPageState:session-1:12000");
  });

  it("takes screenshots", async () => {
    const adapter = new FakeBrowserAdapter();
    const session = await adapter.launch(profile());

    await expect(adapter.screenshot(session, { fullPage: true })).resolves.toEqual(new Uint8Array([1, 2, 3]));
    expect(adapter.calls).toContain("screenshot:session-1:true");
  });
});

describe("executeBrowserAction", () => {
  it("opens URL and returns normalized page state", async () => {
    const adapter = new FakeBrowserAdapter();
    const sessions = new BrowserSessionManager(adapter);

    const result = await executeBrowserAction({
      action: { type: "open", url: "https://example.test", timeoutMs: 10000 },
      profile: profile(),
      sessions,
    });

    expect(result).toMatchObject({
      action: "open",
      status: "running",
      finalUrl: "https://example.test/final",
      title: "Example",
      textSummary: "Hello world",
      artifacts: [],
      timedOut: false,
    });
    expect(adapter.calls).toContain("navigate:session-1:https://example.test:10000");
    expect(adapter.calls).toContain("getPageState:session-1:12000");
  });

  it("captures screenshot artifact metadata", async () => {
    const adapter = new FakeBrowserAdapter();
    const sessions = new BrowserSessionManager(adapter);
    const writes: string[] = [];

    const result = await executeBrowserAction({
      action: { type: "screenshot", fullPage: true },
      profile: profile({ artifactDir: "artifacts" }),
      sessions,
      now: new Date("2026-06-16T12:00:00.000Z"),
      artifactWriter: {
        mkdir: async (path) => { writes.push(`mkdir:${path}`); },
        writeFile: async (path, content) => { writes.push(`write:${path}:${content.byteLength}`); },
      },
    });

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0]).toMatchObject({ kind: "screenshot", mimeType: "image/png", bytes: 3 });
    expect(result.artifacts[0]?.path).toContain("artifacts");
    expect(adapter.calls).toContain("screenshot:session-1:true");
    expect(writes.some((entry) => entry === "mkdir:artifacts")).toBe(true);
  });

  it("returns timeout result", async () => {
    const adapter = new FakeBrowserAdapter();
    adapter.navigateDelayMs = 20;

    const result = await executeBrowserAction({
      action: { type: "open", url: "https://slow.test", timeoutMs: 1 },
      profile: profile(),
      sessions: new BrowserSessionManager(adapter),
    });

    expect(result).toMatchObject({
      action: "open",
      status: "timed_out",
      timedOut: true,
    });
  });
});
