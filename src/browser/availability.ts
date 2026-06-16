import { normalizeBrowserError } from "./errors";
import type { BrowserAvailability } from "./types";

export interface BrowserAvailabilityProbe {
  loadPlaywright(): Promise<void>;
  getBrowserVersion(): Promise<string>;
}

export async function checkBrowserAvailability(probe: BrowserAvailabilityProbe): Promise<BrowserAvailability> {
  try {
    await probe.loadPlaywright();
  } catch (error) {
    return {
      available: false,
      reason: "playwright_unavailable",
      message: normalizeBrowserError("playwright_unavailable", error instanceof Error ? error.message : String(error)),
    };
  }

  try {
    return {
      available: true,
      browserName: "chromium",
      version: await probe.getBrowserVersion(),
    };
  } catch (error) {
    return {
      available: false,
      reason: "browser_unavailable",
      message: normalizeBrowserError("browser_unavailable", error instanceof Error ? error.message : String(error)),
    };
  }
}
