import { describe, expect, it } from "vitest";
import { createToolRegistry, registerTool } from "../../src/tools/registry";
import { dispatchTools } from "../../src/runtime/tool-dispatcher";
import { createBrowserTool, browserToolSchema } from "../../src/tools/browser";
import { BrowserSessionManager } from "../../src/browser/session";
import type { BrowserAdapter, BrowserAdapterSession } from "../../src/browser/playwright-adapter";
import type { BrowserProfile } from "../../src/browser/types";

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

class PermissionOrderAdapter implements BrowserAdapter {
  readonly calls: string[] = [];
  readonly session: BrowserAdapterSession = { id: "browser-session" };

  constructor(private readonly order?: string[]) {}

  async checkAvailability() {
    this.calls.push("checkAvailability");
    return { available: true as const, browserName: "chromium" as const, version: "fake" };
  }

  async launch() {
    this.order?.push("adapter:launch");
    this.calls.push("launch");
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
      finalUrl: "https://example.test/final",
      title: "Example",
      visibleText: "Hello world",
    };
  }

  async screenshot(session: BrowserAdapterSession) {
    this.calls.push(`screenshot:${session.id}`);
    return new Uint8Array([1, 2, 3]);
  }
}

describe("browser permission ordering", () => {
  it("denied browser action does not reach the browser adapter", async () => {
    const adapter = new PermissionOrderAdapter();
    const registry = createToolRegistry();
    registerTool(
      registry,
      "Browser",
      createBrowserTool({ profile: profile(), sessions: new BrowserSessionManager(adapter) }),
      browserToolSchema,
      false,
    );

    const results = await dispatchTools(
      [{ name: "Browser", args: { action: { type: "open", url: "https://example.test" } } }],
      {
        registry,
        permission: {
          async checkPermission() {
            return "denied";
          },
        },
      },
    );

    expect(results[0]).toMatchObject({ name: "Browser", success: false, error: "Permission denied" });
    expect(adapter.calls).toEqual([]);
  });

  it("ask approval is resolved before the browser adapter is called", async () => {
    const order: string[] = [];
    const adapter = new PermissionOrderAdapter(order);
    const registry = createToolRegistry();
    registerTool(
      registry,
      "Browser",
      createBrowserTool({ profile: profile(), sessions: new BrowserSessionManager(adapter) }),
      browserToolSchema,
      false,
    );

    const results = await dispatchTools(
      [{ name: "Browser", args: { action: { type: "open", url: "https://example.test" } } }],
      {
        registry,
        permission: {
          async checkPermission() {
            order.push("permission:ask");
            return "approved";
          },
        },
      },
    );

    expect(results[0]?.success).toBe(true);
    expect(order).toEqual(["permission:ask", "adapter:launch"]);
    expect(adapter.calls).toContain("navigate:browser-session:https://example.test:30000");
  });

  it("allowed browser action routes to the browser manager when enabled", async () => {
    const adapter = new PermissionOrderAdapter();
    const registry = createToolRegistry();
    registerTool(
      registry,
      "Browser",
      createBrowserTool({ profile: profile(), sessions: new BrowserSessionManager(adapter) }),
      browserToolSchema,
      false,
    );

    const results = await dispatchTools(
      [{ name: "Browser", args: { action: { type: "open", url: "https://example.test" } } }],
      {
        registry,
        permission: {
          async checkPermission() {
            return "approved";
          },
        },
      },
    );

    expect(results[0]?.success).toBe(true);
    expect(JSON.parse(results[0]!.output)).toMatchObject({
      action: "open",
      status: "running",
      finalUrl: "https://example.test/final",
    });
    expect(adapter.calls).toContain("launch");
    expect(adapter.calls).toContain("navigate:browser-session:https://example.test:30000");
  });

  it("browser disabled does not bypass permission semantics", async () => {
    const adapter = new PermissionOrderAdapter();
    const registry = createToolRegistry();
    registerTool(
      registry,
      "Browser",
      createBrowserTool({ profile: undefined, sessions: new BrowserSessionManager(adapter) }),
      browserToolSchema,
      false,
    );

    const results = await dispatchTools(
      [{ name: "Browser", args: { action: { type: "open", url: "https://example.test" } } }],
      {
        registry,
        permission: {
          async checkPermission() {
            return "denied";
          },
        },
      },
    );

    expect(results[0]).toMatchObject({ name: "Browser", success: false, error: "Permission denied" });
    expect(adapter.calls).toEqual([]);
  });
});
