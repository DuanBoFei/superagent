import type { TerminalProfile } from "./terminal-profile";

export interface SafeWriter {
  write(s: string): void;
  writeln(s: string): void;
}

export function createSafeWriter(
  profile: TerminalProfile,
  writeFn: (s: string) => boolean,
): SafeWriter {
  const isWindows = profile !== "default";

  return {
    write(s: string) {
      if (isWindows) {
        writeFn(`\r\x1b[K${s}`);
      } else {
        writeFn(s);
      }
    },
    writeln(s: string) {
      if (isWindows) {
        writeFn(`\r\x1b[K${s}\n`);
      } else {
        writeFn(`${s}\n`);
      }
    },
  };
}
