import { describe, expect, it } from "vitest";
import { executeSandboxedCommand } from "../../src/sandbox/executor";
import type { DockerCliAdapter } from "../../src/sandbox/docker-cli";
import type { SandboxExecution } from "../../src/sandbox/types";
import type { LogEvent } from "../../src/observability/types";

function execution(): SandboxExecution {
  return {
    id: "sandbox-1",
    command: "echo ok",
    cwd: "/repo",
    profile: {
      enabled: true,
      type: "docker",
      image: "superagent/sandbox:latest",
      hostWorkspace: "/repo",
      workspaceMount: "/workspace",
      workdir: "/workspace",
      network: "none",
      env: {},
      pullPolicy: "never",
      timeoutMs: 120000,
    },
  };
}

function docker(overrides: Partial<DockerCliAdapter> = {}): DockerCliAdapter {
  return {
    getVersion: async () => "Docker version 1",
    imageExists: async () => true,
    pullImage: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    run: async () => ({ stdout: "ok", stderr: "", exitCode: 0 }),
    ...overrides,
  };
}

describe("executeSandboxedCommand", () => {
  it("emits start and end events around successful execution", async () => {
    const events: LogEvent[] = [];
    const result = await executeSandboxedCommand(execution(), {
      docker: docker(),
      emit: (event) => events.push(event),
    });

    expect(result.exitCode).toBe(0);
    expect(events.map((event) => event.type)).toEqual(["sandbox:start", "sandbox:end"]);
  });

  it("emits failure event when docker is unavailable", async () => {
    const events: LogEvent[] = [];
    const result = await executeSandboxedCommand(execution(), {
      docker: docker({ getVersion: async () => { throw new Error("missing"); } }),
      emit: (event) => events.push(event),
    });

    expect(result.status).toBe("setup_failed");
    expect(events.map((event) => event.type)).toEqual(["sandbox:start", "sandbox:failure"]);
  });
});
