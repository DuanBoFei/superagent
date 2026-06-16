import type { BrowserAvailability, BrowserProfile } from "./types";

export interface BrowserPageStateSnapshot {
  finalUrl: string;
  title: string;
  visibleText: string;
}

export interface BrowserAdapterSession {
  id: string;
}

export interface BrowserAdapter {
  checkAvailability(): Promise<BrowserAvailability>;
  launch(profile: BrowserProfile): Promise<BrowserAdapterSession>;
  close(session: BrowserAdapterSession): Promise<void>;
  navigate(session: BrowserAdapterSession, url: string, timeoutMs: number): Promise<void>;
  getPageState(session: BrowserAdapterSession, maxTextChars: number): Promise<BrowserPageStateSnapshot>;
  screenshot(session: BrowserAdapterSession, options?: { fullPage?: boolean }): Promise<Uint8Array>;
  click(session: BrowserAdapterSession, selector: string, timeoutMs: number): Promise<void>;
  typeText(session: BrowserAdapterSession, selector: string, text: string, timeoutMs: number): Promise<void>;
  select(session: BrowserAdapterSession, selector: string, value: string, timeoutMs: number): Promise<void>;
  wait(
    session: BrowserAdapterSession,
    target: { selector?: string; text?: string; loadState?: "load" | "domcontentloaded" | "networkidle" },
    timeoutMs: number,
  ): Promise<void>;
}

export type PlaywrightLoader = () => Promise<{
  chromium: {
    launch(options: {
      headless: boolean;
      chromiumSandbox?: boolean;
      args?: string[];
    }): Promise<PlaywrightBrowser>;
  };
}>;

interface PlaywrightBrowser {
  version(): string;
  newContext(options: { viewport: { width: number; height: number } }): Promise<PlaywrightContext>;
  close(): Promise<void>;
}

interface PlaywrightContext {
  newPage(): Promise<PlaywrightPage>;
  close(): Promise<void>;
}

interface PlaywrightPage {
  goto(url: string, options: { timeout: number; waitUntil: "domcontentloaded" }): Promise<unknown>;
  url(): string;
  title(): Promise<string>;
  locator(selector: string): { innerText(options: { timeout: number }): Promise<string> };
  screenshot(options: { fullPage?: boolean; type: "png" }): Promise<Buffer>;
  click(selector: string, options: { timeout: number }): Promise<void>;
  fill(selector: string, text: string, options: { timeout: number }): Promise<void>;
  selectOption(selector: string, value: string, options: { timeout: number }): Promise<unknown>;
  waitForSelector(selector: string, options: { timeout: number }): Promise<unknown>;
  waitForLoadState(loadState: "load" | "domcontentloaded" | "networkidle", options: { timeout: number }): Promise<void>;
  getByText(text: string): { waitFor(options: { timeout: number }): Promise<void> };
}

interface PlaywrightSession extends BrowserAdapterSession {
  browser: PlaywrightBrowser;
  context: PlaywrightContext;
  page: PlaywrightPage;
}

const defaultPlaywrightLoader: PlaywrightLoader = async () => {
  const moduleName = "playwright";
  return new Function("moduleName", "return import(moduleName)")(moduleName) as ReturnType<PlaywrightLoader>;
};

export class PlaywrightBrowserAdapter implements BrowserAdapter {
  constructor(private readonly loadPlaywright: PlaywrightLoader = defaultPlaywrightLoader) {}

  async checkAvailability(): Promise<BrowserAvailability> {
    try {
      const playwright = await this.loadPlaywright();
      const browser = await playwright.chromium.launch({ headless: true, chromiumSandbox: false });
      const version = browser.version();
      await browser.close();
      return { available: true, browserName: "chromium", version };
    } catch (error) {
      return {
        available: false,
        reason: "browser_unavailable",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async launch(profile: BrowserProfile): Promise<BrowserAdapterSession> {
    const playwright = await this.loadPlaywright();
    const browser = await playwright.chromium.launch({
      headless: profile.headless,
      chromiumSandbox: false,
      ...(profile.network === "disabled" ? { args: ["--disable-network"] } : {}),
    });
    const context = await browser.newContext({ viewport: profile.viewport });
    const page = await context.newPage();
    const session: PlaywrightSession = { id: crypto.randomUUID(), browser, context, page };
    return session;
  }

  async close(session: BrowserAdapterSession): Promise<void> {
    const playwrightSession = session as PlaywrightSession;
    await playwrightSession.context.close();
    await playwrightSession.browser.close();
  }

  async navigate(session: BrowserAdapterSession, url: string, timeoutMs: number): Promise<void> {
    await (session as PlaywrightSession).page.goto(url, { timeout: timeoutMs, waitUntil: "domcontentloaded" });
  }

  async getPageState(session: BrowserAdapterSession, maxTextChars: number): Promise<BrowserPageStateSnapshot> {
    const page = (session as PlaywrightSession).page;
    const visibleText = await page.locator("body").innerText({ timeout: 1000 });
    return {
      finalUrl: page.url(),
      title: await page.title(),
      visibleText: visibleText.slice(0, maxTextChars),
    };
  }

  async screenshot(session: BrowserAdapterSession, options: { fullPage?: boolean } = {}): Promise<Uint8Array> {
    return new Uint8Array(await (session as PlaywrightSession).page.screenshot({
      fullPage: options.fullPage,
      type: "png",
    }));
  }

  async click(session: BrowserAdapterSession, selector: string, timeoutMs: number): Promise<void> {
    await (session as PlaywrightSession).page.click(selector, { timeout: timeoutMs });
  }

  async typeText(session: BrowserAdapterSession, selector: string, text: string, timeoutMs: number): Promise<void> {
    await (session as PlaywrightSession).page.fill(selector, text, { timeout: timeoutMs });
  }

  async select(session: BrowserAdapterSession, selector: string, value: string, timeoutMs: number): Promise<void> {
    await (session as PlaywrightSession).page.selectOption(selector, value, { timeout: timeoutMs });
  }

  async wait(
    session: BrowserAdapterSession,
    target: { selector?: string; text?: string; loadState?: "load" | "domcontentloaded" | "networkidle" },
    timeoutMs: number,
  ): Promise<void> {
    const page = (session as PlaywrightSession).page;
    if (target.selector !== undefined) {
      await page.waitForSelector(target.selector, { timeout: timeoutMs });
    }
    if (target.text !== undefined) {
      await page.getByText(target.text).waitFor({ timeout: timeoutMs });
    }
    if (target.loadState !== undefined) {
      await page.waitForLoadState(target.loadState, { timeout: timeoutMs });
    }
  }
}
