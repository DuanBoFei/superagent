import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";

const CLI = join(__dirname, "..", "..", "src", "index.ts");

function runCli(env: Record<string, string>): {
  stdout: string;
  stderr: string;
  status: number | null;
} {
  try {
    const result = execSync(`npx tsx "${CLI}"`, {
      env: { ...process.env, ...env },
      stdio: "pipe",
      timeout: 10000,
    });
    return { stdout: result.toString(), stderr: "", status: 0 };
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; stderr?: Buffer; status?: number };
    return {
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
      status: err.status ?? null,
    };
  }
}

describe("CLI smoke", () => {
  it("exits 0 and prints SuperAgent ready when apiKey is set via env", () => {
    const result = runCli({
      SUPERAGENT_API_KEY: "sk-test",
      SUPERAGENT_MODEL: "deepseek-v4-pro",
      // prevent loading real config files
      HOME: "/nonexistent-home",
      USERPROFILE: "/nonexistent-home",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SuperAgent ready");
  });

  it("exits 1 and prints fatal error when apiKey is missing", () => {
    const result = runCli({
      HOME: "/nonexistent-home",
      USERPROFILE: "/nonexistent-home",
      // explicitly clear api key
      SUPERAGENT_API_KEY: "",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Fatal:");
    expect(result.stderr).toContain("API key");
  });

  it("respects SUPERAGENT_MODEL env override", () => {
    const result = runCli({
      SUPERAGENT_API_KEY: "sk-test",
      SUPERAGENT_MODEL: "deepseek-v4-flash",
      HOME: "/nonexistent-home",
      USERPROFILE: "/nonexistent-home",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SuperAgent ready");
  });
});
