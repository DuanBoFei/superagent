import { describe, expect, it } from "vitest";
import { resolveSandboxProfile } from "../../src/sandbox/config";
import type { SandboxConfig } from "../../src/sandbox/types";

function sandboxConfig(overrides: Partial<SandboxConfig> = {}): SandboxConfig {
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
    ...overrides,
  };
}

describe("resolveSandboxProfile", () => {
  it("returns undefined when sandbox is disabled", () => {
    expect(resolveSandboxProfile({
      config: sandboxConfig({ enabled: false }),
      hostWorkspace: "/repo",
    })).toBeUndefined();
  });

  it("resolves host workspace and container workdir", () => {
    const profile = resolveSandboxProfile({
      config: sandboxConfig(),
      hostWorkspace: "/repo",
      cwd: "/repo/packages/app",
      env: {},
    });

    expect(profile).toMatchObject({
      enabled: true,
      image: "superagent/sandbox:latest",
      workspaceMount: "/workspace",
      workdir: "/workspace/packages/app",
      network: "none",
    });
  });

  it("merges allowlisted environment before explicit env", () => {
    const profile = resolveSandboxProfile({
      config: sandboxConfig({
        envAllowlist: ["PATH", "API_KEY"],
        env: { API_KEY: "configured", NODE_ENV: "test" },
      }),
      hostWorkspace: "/repo",
      env: { PATH: "/bin", API_KEY: "host-secret" },
    });

    expect(profile?.env).toEqual({
      PATH: "/bin",
      API_KEY: "configured",
      NODE_ENV: "test",
    });
  });
});
