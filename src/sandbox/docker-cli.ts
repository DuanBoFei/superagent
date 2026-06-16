import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface DockerCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface DockerRunOptions {
  image: string;
  command: string;
  hostWorkspace: string;
  workspaceMount: string;
  workdir: string;
  network: "none" | "host";
  env: Record<string, string>;
  timeoutMs: number;
  memoryMb?: number;
  cpus?: number;
}

export interface DockerCliAdapter {
  getVersion(): Promise<string>;
  imageExists(image: string): Promise<boolean>;
  pullImage(image: string): Promise<DockerCommandResult>;
  run(options: DockerRunOptions): Promise<DockerCommandResult>;
}

export function createDockerCliAdapter(): DockerCliAdapter {
  return {
    async getVersion() {
      const { stdout } = await execFileAsync("docker", ["--version"]);
      return stdout.trim();
    },
    async imageExists(image: string) {
      try {
        await execFileAsync("docker", ["image", "inspect", image]);
        return true;
      } catch {
        return false;
      }
    },
    async pullImage(image: string) {
      return runDocker(["pull", image], 0);
    },
    async run(options: DockerRunOptions) {
      return runDocker(buildDockerRunArgs(options), options.timeoutMs);
    },
  };
}

export function buildDockerRunArgs(options: DockerRunOptions): string[] {
  const args = [
    "run",
    "--rm",
    "--volume",
    `${options.hostWorkspace}:${options.workspaceMount}`,
    "--workdir",
    options.workdir,
    "--network",
    options.network,
  ];

  for (const [name, value] of Object.entries(options.env)) {
    args.push("--env", `${name}=${value}`);
  }
  if (options.memoryMb !== undefined) {
    args.push("--memory", `${options.memoryMb}m`);
  }
  if (options.cpus !== undefined) {
    args.push("--cpus", String(options.cpus));
  }

  args.push(options.image, "sh", "-lc", options.command);
  return args;
}

async function runDocker(args: string[], timeoutMs: number): Promise<DockerCommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync("docker", args, {
      timeout: timeoutMs > 0 ? timeoutMs : undefined,
      maxBuffer: 200 * 1024,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; code?: number | string | null };
    return {
      stdout: String(err.stdout ?? ""),
      stderr: String(err.stderr ?? ""),
      exitCode: typeof err.code === "number" ? err.code : 1,
    };
  }
}
