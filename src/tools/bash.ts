import { exec, execFileSync } from "node:child_process";
import { relative, resolve } from "node:path";
import { z } from "zod";
import type { ToolContext, ToolResult } from "./types";

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_BYTES = 100 * 1024;

export const bashToolSchema = z.object({
  command: z.string(),
  timeout_ms: z.number().int().positive().optional(),
});

export async function bashTool(
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult> {
  const parsed = bashToolSchema.safeParse(args);
  if (!parsed.success) {
    return { output: "", error: parsed.error.message };
  }

  const command = parsed.data.command;
  if (command.trim().length === 0) {
    return { output: "", error: "command must not be empty" };
  }

  const cwd = resolve(context.workingDirectory);
  if (!isWithin(context.workingDirectory, cwd)) {
    return {
      output: "",
      error: `Path must stay within project directory: ${context.workingDirectory}`,
    };
  }

  const result = await runCommand(command, cwd, parsed.data.timeout_ms ?? DEFAULT_TIMEOUT_MS);
  const stdout = truncateOutput(result.stdout);
  const stderr = truncateOutput(result.stderr);

  return {
    output: [stdout, stderr].filter((value) => value.length > 0).join(""),
    metadata: {
      stdout,
      stderr,
      exit_code: result.exitCode,
      killed_by_timeout: result.killedByTimeout,
    },
  };
}

function runCommand(
  command: string,
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number | null; killedByTimeout: boolean }> {
  return new Promise((resolveResult) => {
    let stdout = "";
    let stderr = "";
    let killedByTimeout = false;
    let settled = false;
    const child = exec(command, {
      cwd,
      env: { ...process.env, SUPERAGENT_MODE: "true" },
      maxBuffer: MAX_OUTPUT_BYTES * 2,
    });

    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      killedByTimeout = true;
      killProcess(child.pid);
    }, timeoutMs);

    child.on("error", () => {
      clearTimeout(timer);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) {
        return;
      }
      settled = true;
      resolveResult({
        stdout,
        stderr,
        exitCode: killedByTimeout ? null : code,
        killedByTimeout,
      });
    });
  });
}

function killProcess(pid: number | undefined): void {
  if (pid === undefined) {
    return;
  }

  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // Process may have already exited.
    }
    return;
  }

  try {
    process.kill(-pid);
  } catch {
    try {
      process.kill(pid);
    } catch {
      // Process may have already exited.
    }
  }
}

function truncateOutput(output: string): string {
  return Buffer.byteLength(output) <= MAX_OUTPUT_BYTES
    ? output
    : output.slice(0, MAX_OUTPUT_BYTES);
}

function isWithin(root: string, target: string): boolean {
  const rel = relative(resolve(root), target);
  return rel === "" || (!rel.startsWith("..") && !resolve(rel).startsWith(".."));
}
