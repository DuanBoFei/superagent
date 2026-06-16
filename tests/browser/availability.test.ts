import { describe, expect, it } from "vitest";
import { checkBrowserAvailability, type BrowserAvailabilityProbe } from "../../src/browser/availability";

function probe(overrides: Partial<BrowserAvailabilityProbe> = {}): BrowserAvailabilityProbe {
  return {
    loadPlaywright: async () => {},
    getBrowserVersion: async () => "123.0.0",
    ...overrides,
  };
}

describe("checkBrowserAvailability", () => {
  it("reports unavailable Playwright package", async () => {
    const result = await checkBrowserAvailability(probe({
      loadPlaywright: async () => { throw new Error("Cannot find module playwright"); },
    }));

    expect(result).toMatchObject({ available: false, reason: "playwright_unavailable" });
  });

  it("reports unavailable browser executable", async () => {
    const result = await checkBrowserAvailability(probe({
      getBrowserVersion: async () => { throw new Error("chromium executable missing"); },
    }));

    expect(result).toMatchObject({ available: false, reason: "browser_unavailable" });
  });

  it("reports ready browser", async () => {
    await expect(checkBrowserAvailability(probe())).resolves.toEqual({
      available: true,
      browserName: "chromium",
      version: "123.0.0",
    });
  });

  it("returns safe setup failure details", async () => {
    const result = await checkBrowserAvailability(probe({
      getBrowserVersion: async () => { throw new Error("profile setup failed"); },
    }));

    expect(result).toMatchObject({
      available: false,
      reason: "browser_unavailable",
      message: "Browser executable unavailable: profile setup failed",
    });
  });

  it("redacts secret-like diagnostics", async () => {
    const result = await checkBrowserAvailability(probe({
      loadPlaywright: async () => { throw new Error("failed with token=sk-secret-token"); },
    }));

    expect(result.available).toBe(false);
    expect(result.message).not.toContain("sk-secret-token");
    expect(result.message).toContain("[REDACTED]");
  });
});
