import { resolve } from "node:path";
import type { BrowserConfig, BrowserProfile } from "./types";

export interface ResolveBrowserProfileInput {
  config: BrowserConfig;
  workspace: string;
}

export function resolveBrowserProfile(input: ResolveBrowserProfileInput): BrowserProfile | undefined {
  if (!input.config.enabled) {
    return undefined;
  }

  return {
    enabled: true,
    headless: input.config.headless,
    defaultTimeoutMs: input.config.defaultTimeoutMs,
    artifactDir: resolve(input.workspace, input.config.artifactDir),
    viewport: input.config.viewport,
    network: input.config.network,
    captureScreenshots: input.config.captureScreenshots,
  };
}
