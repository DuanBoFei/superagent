import { describe, expect, it } from "vitest";
import {
  sandboxLifecycleStatuses,
  type SandboxAvailability,
  type SandboxConfig,
  type SandboxExecution,
  type SandboxLifecycleStatus,
  type SandboxProfile,
  type SandboxResult,
} from "../../src/sandbox/types";

describe("sandbox domain types", () => {
  it("models sandbox configuration", () => {
    const config: SandboxConfig = {
      enabled: true,
      type: "docker",
      image: "superagent/sandbox:latest",
      workspaceMount: "/workspace",
      network: "none",
      envAllowlist: ["PATH"],
      env: { NODE_ENV: "test" },
      pullPolicy: "missing",
      timeoutMs: 120000,
      memoryMb: 512,
      cpus: 1,
    };

    expect(config.type).toBe("docker");
    expect(config.network).toBe("none");
    expect(config.pullPolicy).toBe("missing");
  });

  it("models a resolved sandbox profile", () => {
    const profile: SandboxProfile = {
      enabled: true,
      type: "docker",
      image: "superagent/sandbox:latest",
      hostWorkspace: "/host/repo",
      workspaceMount: "/workspace",
      workdir: "/workspace/packages/app",
      network: "host",
      env: { PATH: "/usr/bin", NODE_ENV: "test" },
      pullPolicy: "never",
      timeoutMs: 60000,
      memoryMb: 1024,
      cpus: 2,
    };

    expect(profile.workdir.startsWith(profile.workspaceMount)).toBe(true);
    expect(profile.env.NODE_ENV).toBe("test");
  });

  it("models Docker availability checks", () => {
    const available: SandboxAvailability = {
      available: true,
      dockerVersion: "Docker version 27.0.0",
      imagePresent: true,
    };
    const unavailable: SandboxAvailability = {
      available: false,
      reason: "docker_unavailable",
      message: "Docker daemon is not reachable",
    };

    expect(available.available).toBe(true);
    expect(unavailable.reason).toBe("docker_unavailable");
  });

  it("models sandbox command execution input", () => {
    const execution: SandboxExecution = {
      id: "exec-1",
      command: "pnpm test",
      cwd: "/host/repo",
      profile: {
        enabled: true,
        type: "docker",
        image: "superagent/sandbox:latest",
        hostWorkspace: "/host/repo",
        workspaceMount: "/workspace",
        workdir: "/workspace",
        network: "none",
        env: {},
        pullPolicy: "never",
        timeoutMs: 120000,
      },
    };

    expect(execution.profile.network).toBe("none");
  });

  it("models successful and failed sandbox results", () => {
    const success: SandboxResult = {
      status: "completed",
      stdout: "ok\n",
      stderr: "",
      exitCode: 0,
      timedOut: false,
      durationMs: 42,
    };
    const failure: SandboxResult = {
      status: "setup_failed",
      stdout: "",
      stderr: "",
      exitCode: null,
      timedOut: false,
      durationMs: 5,
      safeError: "Docker image is unavailable",
    };

    expect(success.exitCode).toBe(0);
    expect(failure.safeError).toContain("Docker image");
  });

  it("defines sandbox lifecycle status values", () => {
    const statuses: SandboxLifecycleStatus[] = [...sandboxLifecycleStatuses];

    expect(statuses).toEqual([
      "starting",
      "running",
      "completed",
      "setup_failed",
      "timed_out",
    ]);
  });
});
