import { describe, expect, it } from "vitest";
import { buildDockerRunArgs } from "../../src/sandbox/docker-cli";

describe("buildDockerRunArgs", () => {
  it("builds a docker run command with workspace, network and shell command", () => {
    expect(buildDockerRunArgs({
      image: "superagent/sandbox:latest",
      command: "pnpm test",
      hostWorkspace: "/repo",
      workspaceMount: "/workspace",
      workdir: "/workspace/packages/app",
      network: "none",
      env: {},
      timeoutMs: 120000,
    })).toEqual([
      "run",
      "--rm",
      "--volume",
      "/repo:/workspace",
      "--workdir",
      "/workspace/packages/app",
      "--network",
      "none",
      "superagent/sandbox:latest",
      "sh",
      "-lc",
      "pnpm test",
    ]);
  });

  it("adds env and resource limits when configured", () => {
    expect(buildDockerRunArgs({
      image: "img",
      command: "echo ok",
      hostWorkspace: "/repo",
      workspaceMount: "/workspace",
      workdir: "/workspace",
      network: "host",
      env: { NODE_ENV: "test" },
      timeoutMs: 1000,
      memoryMb: 512,
      cpus: 1,
    })).toContain("--memory");
  });
});
