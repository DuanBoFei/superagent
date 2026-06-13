import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bashTool } from "../../src/tools/bash";
import type { ToolContext } from "../../src/tools/types";

let workspace: string;
let context: ToolContext;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "superagent-bash-"));
  context = { workingDirectory: workspace, sessionId: "test-session" };
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe("Bash tool", () => {
  it("runs a command in the workspace and captures stdout, stderr, and exit code", async () => {
    const result = await bashTool(
      { command: "node -e \"console.log(process.cwd()); console.error(process.env.SUPERAGENT_MODE)\"" },
      context,
    );

    expect(result.error).toBeUndefined();
    expect(result.metadata).toMatchObject({
      stdout: `${workspace}\n`,
      stderr: "true\n",
      exit_code: 0,
      killed_by_timeout: false,
    });
  });

  it("returns stdout, stderr, and exit code for non-zero commands", async () => {
    const result = await bashTool(
      { command: "node -e \"console.log('out'); console.error('err'); process.exit(7)\"" },
      context,
    );

    expect(result.error).toBeUndefined();
    expect(result.metadata).toMatchObject({
      stdout: "out\n",
      stderr: "err\n",
      exit_code: 7,
      killed_by_timeout: false,
    });
  });

  it("kills commands that exceed the timeout", async () => {
    const result = await bashTool(
      { command: "node -e \"setTimeout(() => {}, 500)\"", timeout_ms: 50 },
      context,
    );

    expect(result.error).toBeUndefined();
    expect(result.metadata).toMatchObject({
      exit_code: null,
      killed_by_timeout: true,
    });
  });

  it("rejects an empty command", async () => {
    const result = await bashTool({ command: "   " }, context);

    expect(result.output).toBe("");
    expect(result.error).toBe("command must not be empty");
  });
});
