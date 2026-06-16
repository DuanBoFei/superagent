export type TerminalProfile = "windows-powershell" | "windows-vscode" | "default";

export function detectTerminalProfile(
  platform: string,
  env: Record<string, string | undefined>,
): TerminalProfile {
  if (platform !== "win32") {
    return "default";
  }

  if (env.TERM_PROGRAM === "vscode" || env.VSCODE_IPC_HOOK_CLI !== undefined) {
    return "windows-vscode";
  }

  return "windows-powershell";
}
