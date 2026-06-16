import { describe, expect, expectTypeOf, it } from "vitest";
import {
  browserLifecycleStatuses,
  type BrowserAction,
  type BrowserArtifact,
  type BrowserAvailability,
  type BrowserConfig,
  type BrowserResult,
  type BrowserSession,
} from "../../src/browser/types";

describe("browser domain types", () => {
  it("defines browser lifecycle statuses", () => {
    expect(browserLifecycleStatuses).toEqual([
      "idle",
      "starting",
      "running",
      "closed",
      "failed",
      "timed_out",
    ]);
  });

  it("defines browser config shape", () => {
    expectTypeOf<BrowserConfig>().toEqualTypeOf<{
      enabled: boolean;
      headless: boolean;
      defaultTimeoutMs: number;
      artifactDir: string;
      viewport: { width: number; height: number };
      network: "enabled" | "disabled";
      captureScreenshots: boolean;
    }>();
  });

  it("defines availability states", () => {
    expectTypeOf<BrowserAvailability>().toEqualTypeOf<
      | { available: true; browserName: "chromium"; version?: string }
      | {
          available: false;
          reason: "playwright_unavailable" | "browser_unavailable" | "launch_failed";
          message: string;
        }
    >();
  });

  it("defines session state", () => {
    expectTypeOf<BrowserSession>().toEqualTypeOf<{
      id: string;
      status: "idle" | "starting" | "running" | "closed" | "failed" | "timed_out";
      createdAt: Date;
      updatedAt: Date;
      currentUrl?: string;
    }>();
  });

  it("defines supported browser actions", () => {
    expectTypeOf<BrowserAction>().toEqualTypeOf<
      | { type: "open"; url: string; timeoutMs?: number }
      | { type: "click"; selector: string; timeoutMs?: number }
      | { type: "type"; selector: string; text: string; timeoutMs?: number }
      | { type: "select"; selector: string; value: string; timeoutMs?: number }
      | { type: "wait"; selector?: string; text?: string; loadState?: "load" | "domcontentloaded" | "networkidle"; timeoutMs?: number }
      | { type: "screenshot"; fullPage?: boolean; timeoutMs?: number }
      | { type: "close"; timeoutMs?: number }
    >();
  });

  it("defines artifact metadata", () => {
    expectTypeOf<BrowserArtifact>().toEqualTypeOf<{
      id: string;
      kind: "screenshot";
      path: string;
      mimeType: "image/png";
      bytes: number;
      createdAt: Date;
    }>();
  });

  it("defines normalized browser result shape", () => {
    expectTypeOf<BrowserResult>().toEqualTypeOf<{
      action: BrowserAction["type"];
      status: "idle" | "running" | "closed" | "failed" | "timed_out";
      finalUrl?: string;
      title?: string;
      textSummary?: string;
      artifacts: BrowserArtifact[];
      timedOut: boolean;
      durationMs: number;
      safeError?: string;
    }>();
  });
});
