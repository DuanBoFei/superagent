import { describe, expect, it } from "vitest";
import { checkSandboxAvailability } from "../../src/sandbox/availability";
import type { DockerCliAdapter } from "../../src/sandbox/docker-cli";
import type { SandboxProfile } from "../../src/sandbox/types";

function profile(overrides: Partial<SandboxProfile> = {}): SandboxProfile {
  return {
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
    ...overrides,
  };
}

function docker(overrides: Partial<DockerCliAdapter> = {}): DockerCliAdapter {
  return {
    getVersion: async () => "Docker version 1",
    imageExists: async () => true,
    pullImage: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    run: async () => ({ stdout: "", stderr: "", exitCode: 0 }),
    ...overrides,
  };
}

describe("checkSandboxAvailability", () => {
  it("reports unavailable docker", async () => {
    const result = await checkSandboxAvailability(profile(), docker({
      getVersion: async () => { throw new Error("docker missing"); },
    }));

    expect(result).toMatchObject({ available: false, reason: "docker_unavailable" });
  });

  it("uses present image without pulling", async () => {
    const result = await checkSandboxAvailability(profile(), docker());

    expect(result).toEqual({ available: true, dockerVersion: "Docker version 1", imagePresent: true });
  });

  it("does not pull missing images when pull policy is never", async () => {
    const result = await checkSandboxAvailability(profile(), docker({ imageExists: async () => false }));

    expect(result).toMatchObject({ available: false, reason: "image_unavailable" });
  });

  it("pulls missing images when policy allows it", async () => {
    const result = await checkSandboxAvailability(
      profile({ pullPolicy: "missing" }),
      docker({ imageExists: async () => false }),
    );

    expect(result).toEqual({ available: true, dockerVersion: "Docker version 1", imagePresent: false });
  });
});
