export type SandboxType = "docker";
export type SandboxNetwork = "none" | "host";
export type SandboxPullPolicy = "never" | "missing" | "always";

export const sandboxLifecycleStatuses = [
  "starting",
  "running",
  "completed",
  "setup_failed",
  "timed_out",
] as const;

export type SandboxLifecycleStatus = (typeof sandboxLifecycleStatuses)[number];

export interface SandboxConfig {
  enabled: boolean;
  type: SandboxType;
  image?: string;
  workspaceMount: string;
  network: SandboxNetwork;
  envAllowlist: string[];
  env: Record<string, string>;
  pullPolicy: SandboxPullPolicy;
  timeoutMs: number;
  memoryMb?: number;
  cpus?: number;
}

export interface SandboxProfile extends Omit<SandboxConfig, "envAllowlist"> {
  enabled: true;
  image: string;
  hostWorkspace: string;
  workdir: string;
}

export type SandboxAvailability =
  | {
      available: true;
      dockerVersion?: string;
      imagePresent: boolean;
    }
  | {
      available: false;
      reason: "docker_unavailable" | "image_unavailable" | "pull_failed";
      message: string;
    };

export interface SandboxExecution {
  id: string;
  command: string;
  cwd: string;
  profile: SandboxProfile;
}

export interface SandboxResult {
  status: Exclude<SandboxLifecycleStatus, "starting" | "running">;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  safeError?: string;
}
