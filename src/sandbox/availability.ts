import type { DockerCliAdapter } from "./docker-cli";
import type { SandboxAvailability, SandboxProfile } from "./types";
import { normalizeSandboxError } from "./errors";

export async function checkSandboxAvailability(
  profile: SandboxProfile,
  docker: DockerCliAdapter,
): Promise<SandboxAvailability> {
  let dockerVersion = "";
  try {
    dockerVersion = await docker.getVersion();
  } catch (error) {
    return {
      available: false,
      reason: "docker_unavailable",
      message: normalizeSandboxError("docker_unavailable", error instanceof Error ? error.message : String(error)),
    };
  }

  const imagePresent = await docker.imageExists(profile.image);
  if (imagePresent) {
    return { available: true, dockerVersion, imagePresent: true };
  }

  if (profile.pullPolicy === "never") {
    return {
      available: false,
      reason: "image_unavailable",
      message: normalizeSandboxError("image_unavailable", profile.image),
    };
  }

  try {
    const pull = await docker.pullImage(profile.image);
    if (pull.exitCode !== 0) {
      return {
        available: false,
        reason: "pull_failed",
        message: normalizeSandboxError("pull_failed", pull.stderr || pull.stdout),
      };
    }
  } catch (error) {
    return {
      available: false,
      reason: "pull_failed",
      message: normalizeSandboxError("pull_failed", error instanceof Error ? error.message : String(error)),
    };
  }

  return { available: true, dockerVersion, imagePresent: false };
}
