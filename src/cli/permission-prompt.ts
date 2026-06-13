import type { PermissionResult } from "./types";

const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

export async function promptPermission(
  toolName: string,
  command: string,
  timeoutMs = 30_000,
): Promise<PermissionResult> {
  const prompt = `${YELLOW}⚠ Allow [${toolName}] ${command}? [Y]es [N]o [A]lways${RESET} `;
  process.stdout.write(prompt);

  return new Promise((resolve) => {
    const stdin = process.stdin;

    if (!stdin.isTTY) {
      process.stdout.write("(auto-deny: not a TTY)\n");
      return resolve("denied");
    }

    const prevRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    const timeout = setTimeout(() => {
      cleanup();
      process.stdout.write("\n(auto-deny: timeout)\n");
      resolve("denied");
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      stdin.setRawMode(prevRaw ?? false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };

    const onData = (buf: Buffer) => {
      const key = buf.toString("utf-8").toLowerCase();
      cleanup();

      if (key === "y") {
        process.stdout.write("Yes\n");
        resolve("approved");
      } else if (key === "a") {
        process.stdout.write("Always\n");
        resolve("always");
      } else {
        process.stdout.write("No\n");
        resolve("denied");
      }
    };

    stdin.on("data", onData);
  });
}
