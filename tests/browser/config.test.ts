import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveBrowserProfile } from "../../src/browser/config";
import type { BrowserConfig } from "../../src/browser/types";

function browserConfig(overrides: Partial<BrowserConfig> = {}): BrowserConfig {
  return {
    enabled: true,
    headless: true,
    defaultTimeoutMs: 30000,
    artifactDir: ".superagent/browser-artifacts",
    viewport: { width: 1280, height: 720 },
    network: "enabled",
    captureScreenshots: true,
    ...overrides,
  };
}

describe("resolveBrowserProfile", () => {
  it("returns undefined when browser is disabled", () => {
    expect(resolveBrowserProfile({
      config: browserConfig({ enabled: false }),
      workspace: "/repo",
    })).toBeUndefined();
  });

  it("preserves headless mode", () => {
    expect(resolveBrowserProfile({
      config: browserConfig({ headless: false }),
      workspace: "/repo",
    })?.headless).toBe(false);
  });

  it("preserves finite default timeout", () => {
    expect(resolveBrowserProfile({
      config: browserConfig({ defaultTimeoutMs: 10000 }),
      workspace: "/repo",
    })?.defaultTimeoutMs).toBe(10000);
  });

  it("preserves viewport defaults", () => {
    expect(resolveBrowserProfile({
      config: browserConfig(),
      workspace: "/repo",
    })?.viewport).toEqual({ width: 1280, height: 720 });
  });

  it("resolves artifact directory under workspace", () => {
    expect(resolveBrowserProfile({
      config: browserConfig({ artifactDir: ".superagent/custom-browser-artifacts" }),
      workspace: "/repo",
    })?.artifactDir).toBe(resolve("/repo", ".superagent/custom-browser-artifacts"));
  });

  it("preserves screenshot capture default", () => {
    expect(resolveBrowserProfile({
      config: browserConfig(),
      workspace: "/repo",
    })?.captureScreenshots).toBe(true);
  });

  it("preserves network policy default", () => {
    expect(resolveBrowserProfile({
      config: browserConfig(),
      workspace: "/repo",
    })?.network).toBe("enabled");
  });
});
