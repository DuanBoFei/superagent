import { spawn } from "node:child_process";

export interface BrowserOpenOptions {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  spawn?: typeof spawn;
}

export interface BrowserOpenResult {
  opened: boolean;
  skipped: boolean;
  error?: string;
}

export async function openBrowser(url: string, options: BrowserOpenOptions = {}): Promise<BrowserOpenResult> {
  const env = options.env ?? process.env;
  if (env.CI === "true" || env.HEADLESS === "true") {
    return { opened: false, skipped: true };
  }

  const platform = options.platform ?? process.platform;
  const spawnFn = options.spawn ?? spawn;
  const { command, args, shell } = browserCommand(platform, url);

  return new Promise((resolve) => {
    const child = spawnFn(command, args, { detached: true, stdio: "ignore", shell });
    child.once("error", (error) => resolve({ opened: false, skipped: false, error: error.message }));
    child.once("spawn", () => {
      child.unref();
      resolve({ opened: true, skipped: false });
    });
  });
}

function browserCommand(platform: NodeJS.Platform, url: string): { command: string; args: string[]; shell?: boolean } {
  if (platform === "darwin") {
    return { command: "open", args: [url] };
  }
  if (platform === "win32") {
    return { command: "start", args: ["", url], shell: true };
  }
  return { command: "xdg-open", args: [url] };
}
