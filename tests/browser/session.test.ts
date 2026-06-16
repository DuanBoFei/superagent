import { describe, expect, it } from "vitest";
import { BrowserSessionManager } from "../../src/browser/session";
import type { BrowserAdapter, BrowserAdapterSession } from "../../src/browser/playwright-adapter";
import type { BrowserProfile } from "../../src/browser/types";

function profile(): BrowserProfile {
  return {
    enabled: true,
    headless: true,
    defaultTimeoutMs: 30000,
    artifactDir: "/repo/.superagent/browser-artifacts",
    viewport: { width: 1280, height: 720 },
    network: "enabled",
    captureScreenshots: true,
  };
}

class FakeAdapter implements BrowserAdapter {
  launchCount = 0;
  closeCount = 0;
  session: BrowserAdapterSession = { id: "adapter-session-1" };
  launchError: Error | undefined;

  async checkAvailability() {
    return { available: true as const, browserName: "chromium" as const };
  }

  async launch() {
    this.launchCount += 1;
    if (this.launchError) {
      throw this.launchError;
    }
    return this.session;
  }

  async close() {
    this.closeCount += 1;
  }

  async navigate() {}

  async getPageState() {
    return { finalUrl: "https://example.test", title: "Example", visibleText: "Hello" };
  }

  async screenshot() {
    return new Uint8Array([1]);
  }
}

function manager(adapter = new FakeAdapter()) {
  let tick = 0;
  return new BrowserSessionManager(
    adapter,
    () => new Date(`2026-06-16T12:00:0${tick++}.000Z`),
    () => "browser-session-1",
  );
}

describe("BrowserSessionManager", () => {
  it("launches on first action when enabled", async () => {
    const adapter = new FakeAdapter();
    const result = await manager(adapter).start(profile());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session).toMatchObject({
        id: "browser-session-1",
        status: "running",
        adapterSessionId: "adapter-session-1",
      });
    }
    expect(adapter.launchCount).toBe(1);
  });

  it("reuses context for repeated actions", async () => {
    const adapter = new FakeAdapter();
    const sessions = manager(adapter);

    const first = await sessions.start(profile());
    const second = await sessions.start(profile());

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(adapter.launchCount).toBe(1);
  });

  it("closes explicit action", async () => {
    const adapter = new FakeAdapter();
    const sessions = manager(adapter);

    await sessions.start(profile());
    await sessions.close();

    expect(adapter.closeCount).toBe(1);
    expect(sessions.current?.status).toBe("closed");
  });

  it("cleans up on session stop", async () => {
    const adapter = new FakeAdapter();
    const sessions = manager(adapter);

    await sessions.start(profile());
    await sessions.cleanup();

    expect(adapter.closeCount).toBe(1);
    expect(sessions.current?.status).toBe("closed");
  });

  it("isolates setup failures", async () => {
    const adapter = new FakeAdapter();
    adapter.launchError = new Error("launch failed token=sk-secret-token");

    const result = await manager(adapter).start(profile());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.session.status).toBe("failed");
      expect(result.safeError).toContain("Browser setup failed: launch failed token=[REDACTED]");
      expect(result.safeError).not.toContain("sk-secret-token");
    }
  });

  it("tracks current URL and lifecycle status transitions", async () => {
    const sessions = manager();
    await sessions.start(profile());

    sessions.markCurrentUrl("https://example.test");

    expect(sessions.current).toMatchObject({
      status: "running",
      currentUrl: "https://example.test",
    });
  });
});
