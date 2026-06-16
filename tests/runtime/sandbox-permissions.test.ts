import { describe, expect, it } from "vitest";
import { createToolRegistry, registerTool } from "../../src/tools/registry";
import { bashTool, bashToolSchema } from "../../src/tools/bash";
import { createScheduler } from "../../src/scheduling/scheduler";
import type { DockerCliAdapter } from "../../src/sandbox/docker-cli";
import type { SandboxConfig } from "../../src/sandbox/types";

function sandboxConfig(): SandboxConfig {
  return {
    enabled: true,
    type: "docker",
    image: "superagent/sandbox:latest",
    workspaceMount: "/workspace",
    network: "none",
    envAllowlist: [],
    env: {},
    pullPolicy: "never",
    timeoutMs: 120000,
  };
}

describe("sandbox permission ordering", () => {
  it("checks permission before starting sandbox", async () => {
    const registry = createToolRegistry();
    registerTool(registry, "Bash", bashTool, bashToolSchema, false);
    let dockerTouched = false;
    const docker: DockerCliAdapter = {
      getVersion: async () => { dockerTouched = true; return "Docker version 1"; },
      imageExists: async () => { dockerTouched = true; return true; },
      pullImage: async () => { dockerTouched = true; return { stdout: "", stderr: "", exitCode: 0 }; },
      run: async () => { dockerTouched = true; return { stdout: "", stderr: "", exitCode: 0 }; },
    };

    const scheduler = createScheduler(registry, {
      checkPermission: async () => "denied",
    }, {
      sandbox: { config: sandboxConfig(), docker },
    });

    const result = await scheduler.dispatchTools([{ id: 1, name: "Bash", args: { command: "echo no" } }]);

    expect(result[0]).toMatchObject({ success: false, error: "Permission denied" });
    expect(dockerTouched).toBe(false);
  });
});
