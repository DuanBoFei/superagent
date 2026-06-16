import { createDockerCliAdapter, type DockerCliAdapter } from "./docker-cli";
import { checkSandboxAvailability } from "./availability";
import { normalizeSandboxCommandResult, normalizeSandboxFailure } from "./results";
import { safeSandboxOutput } from "./errors";
import type { SandboxExecution, SandboxResult } from "./types";
import type { LogEvent } from "../observability/types";

export interface SandboxExecutorOptions {
  docker?: DockerCliAdapter;
  emit?: (event: LogEvent) => void;
}

export async function executeSandboxedCommand(
  execution: SandboxExecution,
  options: SandboxExecutorOptions = {},
): Promise<SandboxResult> {
  const docker = options.docker ?? createDockerCliAdapter();
  const startedAt = Date.now();
  const commandSummary = safeSandboxOutput(execution.command);

  options.emit?.({
    type: "sandbox:start",
    executionId: execution.id,
    image: execution.profile.image,
    workspaceMount: execution.profile.workspaceMount,
    network: execution.profile.network,
    commandSummary,
  });

  const availability = await checkSandboxAvailability(execution.profile, docker);
  if (!availability.available) {
    const result = normalizeSandboxFailure(availability.reason, availability.message, Date.now() - startedAt);
    options.emit?.({
      type: "sandbox:failure",
      executionId: execution.id,
      image: execution.profile.image,
      workspaceMount: execution.profile.workspaceMount,
      network: execution.profile.network,
      commandSummary,
      durationMs: result.durationMs,
      timedOut: result.timedOut,
      safeError: result.safeError ?? availability.message,
    });
    return result;
  }

  try {
    const dockerResult = await docker.run({
      image: execution.profile.image,
      command: execution.command,
      hostWorkspace: execution.profile.hostWorkspace,
      workspaceMount: execution.profile.workspaceMount,
      workdir: execution.profile.workdir,
      network: execution.profile.network,
      env: execution.profile.env,
      timeoutMs: execution.profile.timeoutMs,
      memoryMb: execution.profile.memoryMb,
      cpus: execution.profile.cpus,
    });
    const result = normalizeSandboxCommandResult(dockerResult, Date.now() - startedAt);
    options.emit?.({
      type: "sandbox:end",
      executionId: execution.id,
      image: execution.profile.image,
      workspaceMount: execution.profile.workspaceMount,
      network: execution.profile.network,
      commandSummary,
      durationMs: result.durationMs,
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      timedOut: false,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timeout = /timeout|timed out/i.test(message);
    const result = normalizeSandboxFailure(timeout ? "timeout" : "startup_failed", message, Date.now() - startedAt);
    options.emit?.({
      type: "sandbox:failure",
      executionId: execution.id,
      image: execution.profile.image,
      workspaceMount: execution.profile.workspaceMount,
      network: execution.profile.network,
      commandSummary,
      durationMs: result.durationMs,
      timedOut: result.timedOut,
      safeError: result.safeError ?? message,
    });
    return result;
  }
}
