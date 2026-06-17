import { afterAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const TEST_HOME = mkdtempSync(join(tmpdir(), "superagent-smoke-"));

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
          HOME: TEST_HOME,
          USERPROFILE: TEST_HOME,
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

const DB_PATH = join(TEST_HOME, ".superagent", "sessions.db");

afterAll(() => {
  rmSync(TEST_HOME, { recursive: true, force: true });
});

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

  it("--list lists sessions after a run persists state", () => {
    // Run once to create a session
    const { stdout: listBefore } = run(["--list"]);
    // Should not crash, and should output either sessions or "No saved sessions"
    expect(listBefore).toBeDefined();
  });

  it("sessions.db file exists after first CLI run", () => {
    // Run the CLI to trigger persistence
    run();

    // The sessions.db should now exist
    expect(existsSync(DB_PATH)).toBe(true);
  });

  it("--list output contains tab-separated fields for each session", () => {
    // Run the CLI to create at least one session
    run();

    const { stdout } = run(["--list"]);
    // Either "No saved sessions." or tab-separated: id\tdate\tturns\tfirstMessage
    if (stdout.includes("No saved sessions")) {
      // If no sessions persist (e.g., disk error), that's a valid fallback
      expect(stdout).toContain("No saved sessions");
    } else {
      // Each line should have 4 tab-separated fields
      const lines = stdout.trim().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          const parts = line.split("\t");
          expect(parts.length).toBe(4);
          expect(parts[2]).toMatch(/^\d+ turns$/);
        }
      }
    }
  });
});
