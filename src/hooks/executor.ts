import { spawn } from "node:child_process";
import {
  createSafeHookError,
  normalizeHookFailure,
  normalizeInvalidHookJson,
  redactHookSecrets,
  truncateHookOutput,
} from "./errors";
import type { HookConfig, HookEvent, HookResult } from "./types";

export async function executeHook(
  hook: Extract<HookConfig, { enabled: true }>,
  event: HookEvent,
): Promise<HookResult> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const child = spawn(hook.command, hook.args, {
      env: { ...process.env, ...hook.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result: Omit<HookResult, "durationMs" | "stdout" | "stderr">) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ...result,
        durationMs: Date.now() - startedAt,
        stdout: redactHookSecrets(truncateHookOutput(stdout)),
        stderr: redactHookSecrets(truncateHookOutput(stderr)),
      });
    };

    const timer = setTimeout(() => {
      child.kill();
      finish({
        ok: false,
        decision: "continue",
        error: createSafeHookError("TIMEOUT", `timed out after ${hook.timeoutMs}ms`),
      });
    }, hook.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      const code = error.code === "ENOENT" ? "COMMAND_NOT_FOUND" : "NON_ZERO_EXIT";
      finish({
        ok: false,
        decision: "continue",
        error: createSafeHookError(code, error),
      });
    });

    child.on("close", (exitCode) => {
      if (settled) return;

      if (exitCode !== 0) {
        const safeStderr = redactHookSecrets(truncateHookOutput(stderr));
        finish({
          ok: false,
          decision: "continue",
          exitCode: exitCode ?? undefined,
          error: normalizeHookFailure({ exitCode: exitCode ?? -1, stderr: safeStderr }),
        });
        return;
      }

      const trimmedStdout = stdout.trim();
      if (!trimmedStdout) {
        finish({ ok: true, decision: "continue", exitCode: 0 });
        return;
      }

      try {
        const parsed = JSON.parse(trimmedStdout) as { decision?: unknown; message?: unknown };
        if (parsed.decision !== "continue" && parsed.decision !== "block") {
          finish({
            ok: false,
            decision: "continue",
            exitCode: 0,
            error: normalizeInvalidHookJson(trimmedStdout),
          });
          return;
        }

        finish({
          ok: true,
          decision: parsed.decision,
          ...(typeof parsed.message === "string" ? { message: parsed.message } : {}),
          exitCode: 0,
        });
      } catch {
        finish({
          ok: false,
          decision: "continue",
          exitCode: 0,
          error: normalizeInvalidHookJson(trimmedStdout),
        });
      }
    });

    child.stdin.end(JSON.stringify(event));
  });
}
