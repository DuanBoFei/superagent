import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args: string[] = []): { stdout: string; exitCode: number } {
  try {
    const result = execSync(
      [NPX, "tsx", "src/index.ts", ...args].join(" "),
      {
        cwd: process.cwd(),
        encoding: "utf-8",
        timeout: 30000,
        stdio: "pipe",
        env: {
          ...process.env,
          SUPERAGENT_API_KEY: "stub-key",
        },
      },
    );
    return { stdout: result, exitCode: 0 };
  } catch (e: unknown) {
    const execErr = e as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (execErr.stdout as string) ?? "",
      exitCode: execErr.status ?? 1,
    };
  }
}

describe("End-to-end smoke test", () => {
  it("default run prints SuperAgent and exits 0", () => {
    const { stdout, exitCode } = run();

    expect(exitCode).toBe(0);
    expect(stdout).toContain("SuperAgent");
  });

  it("--resume flag loads stub session without crash", () => {
    const { stdout, exitCode } = run(["--resume", "test-id"]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain("SuperAgent");
    expect(stdout).toContain("resumed: test-id");
  });
});
