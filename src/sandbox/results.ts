import type { DockerCommandResult } from "./docker-cli";
import type { SandboxResult } from "./types";
import { normalizeSandboxError, safeSandboxOutput, type SandboxFailureReason } from "./errors";

export function normalizeSandboxCommandResult(result: DockerCommandResult, durationMs: number): SandboxResult {
  return {
    status: "completed",
    stdout: safeSandboxOutput(result.stdout),
    stderr: safeSandboxOutput(result.stderr),
    exitCode: result.exitCode,
    timedOut: false,
    durationMs,
  };
}

export function normalizeSandboxFailure(
  reason: SandboxFailureReason,
  detail: string,
  durationMs: number,
): SandboxResult {
  return {
    status: reason === "timeout" ? "timed_out" : "setup_failed",
    stdout: "",
    stderr: "",
    exitCode: null,
    timedOut: reason === "timeout",
    durationMs,
    safeError: normalizeSandboxError(reason, detail),
  };
}
