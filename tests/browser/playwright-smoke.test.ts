import { describe, expect, it } from "vitest";
import { executeBrowserAction } from "../../src/browser/actions";
import { PlaywrightBrowserAdapter, type PlaywrightLoader } from "../../src/browser/playwright-adapter";
import { BrowserSessionManager } from "../../src/browser/session";
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

function fakePlaywrightLoader(calls: string[]): PlaywrightLoader {
  return async () => ({
    chromium: {
      async launch(options) {
        calls.push(`launch:${options.headless}:${options.args?.join(",") ?? ""}`);
        return {
          version: () => "fake-chromium",
          async newContext(contextOptions) {
            calls.push(`context:${contextOptions.viewport.width}x${contextOptions.viewport.height}`);
            return {
              async newPage() {
                calls.push("newPage");
                return {
                  async goto(url, gotoOptions) {
                    calls.push(`goto:${url}:${gotoOptions.timeout}:${gotoOptions.waitUntil}`);
                  },
                  url: () => "http://127.0.0.1:4173/final",
                  title: async () => "Smoke Page",
                  locator: (selector) => ({
                    innerText: async (options) => {
                      calls.push(`innerText:${selector}:${options.timeout}`);
                      return "Smoke page ready";
                    },
                  }),
                  screenshot: async (options) => {
                    calls.push(`screenshot:${options.fullPage === true}:${options.type}`);
                    return Buffer.from([1, 2, 3]);
                  },
                  click: async (selector, options) => { calls.push(`click:${selector}:${options.timeout}`); },
                  fill: async (selector, text, options) => { calls.push(`fill:${selector}:${text}:${options.timeout}`); },
                  selectOption: async (selector, value, options) => { calls.push(`select:${selector}:${value}:${options.timeout}`); },
                  waitForSelector: async (selector, options) => { calls.push(`waitForSelector:${selector}:${options.timeout}`); },
                  waitForLoadState: async (loadState, options) => { calls.push(`waitForLoadState:${loadState}:${options.timeout}`); },
                  getByText: (text) => ({ waitFor: async (options) => { calls.push(`waitForText:${text}:${options.timeout}`); } }),
                };
              },
              async close() { calls.push("context:close"); },
            };
          },
          async close() { calls.push("browser:close"); },
        };
      },
    },
  });
}

describe("Playwright browser smoke", () => {
  it("drives the Playwright adapter boundary and writes screenshot artifacts", async () => {
    const calls: string[] = [];
    const writes: string[] = [];
    const adapter = new PlaywrightBrowserAdapter(fakePlaywrightLoader(calls));
    const sessions = new BrowserSessionManager(adapter);

    const openResult = await executeBrowserAction({
      action: { type: "open", url: "http://127.0.0.1:4173", timeoutMs: 5000 },
      profile: profile(),
      sessions,
    });
    const screenshotResult = await executeBrowserAction({
      action: { type: "screenshot", fullPage: true },
      profile: profile({ artifactDir: "artifacts" }),
      sessions,
      now: new Date("2026-06-16T12:00:00.000Z"),
      artifactWriter: {
        mkdir: async (path) => { writes.push(`mkdir:${path}`); },
        writeFile: async (path, content) => { writes.push(`write:${path}:${content.byteLength}`); },
      },
    });

    expect(openResult).toMatchObject({
      action: "open",
      status: "running",
      finalUrl: "http://127.0.0.1:4173/final",
      title: "Smoke Page",
      textSummary: "Smoke page ready",
    });
    expect(screenshotResult.artifacts[0]).toMatchObject({ kind: "screenshot", mimeType: "image/png", bytes: 3 });
    expect(calls).toEqual(expect.arrayContaining([
      "launch:true:",
      "context:1280x720",
      "newPage",
      "goto:http://127.0.0.1:4173:5000:domcontentloaded",
      "innerText:body:1000",
      "screenshot:true:png",
    ]));
    expect(writes.some((entry) => entry === "mkdir:artifacts")).toBe(true);
    expect(writes.some((entry) => entry.startsWith("write:artifacts"))).toBe(true);
  });

  it("can run a real browser smoke when RUN_REAL_BROWSER_SMOKE=1 and Playwright is installed", async () => {
    if (process.env.RUN_REAL_BROWSER_SMOKE !== "1") {
      expect(true).toBe(true);
      return;
    }

    let playwright: Awaited<ReturnType<PlaywrightLoader>>;
    try {
      playwright = await new Function("return import('playwright')")();
    } catch {
      expect.fail("RUN_REAL_BROWSER_SMOKE=1 requires the playwright package and browser binaries");
    }

    const adapter = new PlaywrightBrowserAdapter(async () => playwright);
    const availability = await adapter.checkAvailability();
    expect(availability.available).toBe(true);
  });
});
