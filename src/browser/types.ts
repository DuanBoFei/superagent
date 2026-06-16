export type BrowserNetwork = "enabled" | "disabled";

export const browserLifecycleStatuses = [
  "idle",
  "starting",
  "running",
  "closed",
  "failed",
  "timed_out",
] as const;

export type BrowserLifecycleStatus = (typeof browserLifecycleStatuses)[number];

export interface BrowserConfig {
  enabled: boolean;
  headless: boolean;
  defaultTimeoutMs: number;
  artifactDir: string;
  viewport: {
    width: number;
    height: number;
  };
  network: BrowserNetwork;
  captureScreenshots: boolean;
}

export interface BrowserProfile extends BrowserConfig {
  enabled: true;
  artifactDir: string;
}

export type BrowserAvailability =
  | {
      available: true;
      browserName: "chromium";
      version?: string;
    }
  | {
      available: false;
      reason: "playwright_unavailable" | "browser_unavailable" | "launch_failed";
      message: string;
    };

export interface BrowserSession {
  id: string;
  status: BrowserLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  currentUrl?: string;
  adapterSessionId?: string;
}

export type BrowserAction =
  | { type: "open"; url: string; timeoutMs?: number }
  | { type: "click"; selector: string; timeoutMs?: number }
  | { type: "type"; selector: string; text: string; timeoutMs?: number }
  | { type: "select"; selector: string; value: string; timeoutMs?: number }
  | { type: "wait"; selector?: string; text?: string; loadState?: "load" | "domcontentloaded" | "networkidle"; timeoutMs?: number }
  | { type: "screenshot"; fullPage?: boolean; timeoutMs?: number }
  | { type: "close"; timeoutMs?: number };

export interface BrowserArtifact {
  id: string;
  kind: "screenshot";
  path: string;
  mimeType: "image/png";
  bytes: number;
  createdAt: Date;
}

export interface BrowserResult {
  action: BrowserAction["type"];
  status: Exclude<BrowserLifecycleStatus, "starting">;
  finalUrl?: string;
  title?: string;
  textSummary?: string;
  actionTrace?: string;
  artifacts: BrowserArtifact[];
  timedOut: boolean;
  durationMs: number;
  safeError?: string;
}
