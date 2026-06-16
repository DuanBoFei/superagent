import { resolve } from "node:path";
import type { SandboxConfig, SandboxProfile } from "./types";

export interface ResolveSandboxProfileInput {
  config: SandboxConfig;
  hostWorkspace: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export function resolveSandboxProfile(input: ResolveSandboxProfileInput): SandboxProfile | undefined {
  if (!input.config.enabled) {
    return undefined;
  }

  const hostWorkspace = resolve(input.hostWorkspace);
  const workspaceMount = input.config.workspaceMount;
  const cwd = resolve(input.cwd ?? hostWorkspace);
  const relativeCwd = cwd.startsWith(hostWorkspace)
    ? cwd.slice(hostWorkspace.length).replace(/^[\\/]/, "")
    : "";
  const workdir = relativeCwd.length > 0
    ? `${workspaceMount}/${relativeCwd.replace(/\\/g, "/")}`
    : workspaceMount;
  const sourceEnv = input.env ?? process.env;
  const env: Record<string, string> = {};

  for (const name of input.config.envAllowlist) {
    const value = sourceEnv[name];
    if (value !== undefined) {
      env[name] = value;
    }
  }

  return {
    enabled: true,
    type: input.config.type,
    image: input.config.image ?? "",
    hostWorkspace,
    workspaceMount,
    workdir,
    network: input.config.network,
    env: { ...env, ...input.config.env },
    pullPolicy: input.config.pullPolicy,
    timeoutMs: input.config.timeoutMs,
    ...(input.config.memoryMb !== undefined ? { memoryMb: input.config.memoryMb } : {}),
    ...(input.config.cpus !== undefined ? { cpus: input.config.cpus } : {}),
  };
}
