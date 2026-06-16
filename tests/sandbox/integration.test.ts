import { describe, expect, it } from "vitest";
import { createToolRegistry, registerTool } from "../../src/tools/registry";
import { bashTool, bashToolSchema } from "../../src/tools/bash";
import { createScheduler } from "../../src/scheduling/scheduler";
import type { LogEvent } from "../../src/observability/types";
import type { DockerCliAdapter } from "../../src/sandbox/docker-cli";
import type { SandboxConfig } from "../../src/sandbox/types";

function sandboxConfig(): SandboxConfig {
  return {
    enabled: true,
    type: "docker",
    image: "superagent/sandbox:latest",
    workspaceMount: "/workspace",
    network: "none",
    envAllowlist: ["PATH"],
    env: { NODE_ENV: "test" },
    pullPolicy: "never",
    timeoutMs: 120000,
  };
}

describe("sandbox integration", () => {
  it("routes approved Bash commands through docker sandbox and emits lifecycle events", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "Bash", bashTool, bashToolSchema, false);
    const events: LogEvent[] = [];
    const dockerRuns: string[] = [];
    const docker: DockerCliAdapter = {
      getVersion: async () => "Docker version 1",
      imageExists: async () => true,
      pullImage: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
      run: async (options) => {
        dockerRuns.push(options.command);
        return { stdout: "sandbox ok", stderr: "", exitCode: 0 };
      },
    };

    const scheduler = createScheduler(registry, {
      checkPermission: async () => "approved",
    }, {
      workingDirectory: process.cwd(),
      sandbox: { config: sandboxConfig(), docker, emit: (event) => events.push(event) },
    });

    const result = await scheduler.dispatchTools([{ id: 1, name: "Bash", args: { command: "echo ok" } }]);

    expect(result[0]).toMatchObject({ success: true, output: "sandbox ok" });
    expect(dockerRuns).toEqual(["echo ok"]);
    expect(events.map((event) => event.type)).toEqual(["sandbox:start", "sandbox:end"]);
  });
});
