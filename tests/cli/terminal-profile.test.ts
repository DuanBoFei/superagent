import { describe, expect, it } from "vitest";
import { detectTerminalProfile } from "../../src/cli/terminal-profile";
import type { TerminalProfile } from "../../src/cli/terminal-profile";

describe("detectTerminalProfile", () => {
  it("detects Windows PowerShell when PSModulePath is present", () => {
    const profile = detectTerminalProfile("win32", {
      PSModulePath: "C:\\Users\\test\\Documents\\PowerShell\\Modules",
    });
    expect(profile).toBe("windows-powershell");
  });

  it("detects Windows PowerShell when no specific terminal env vars are set", () => {
    const profile = detectTerminalProfile("win32", {});
    expect(profile).toBe("windows-powershell");
  });

  it("detects Windows VS Code terminal from TERM_PROGRAM", () => {
    const profile = detectTerminalProfile("win32", {
      TERM_PROGRAM: "vscode",
    });
    expect(profile).toBe("windows-vscode");
  });

  it("detects Windows VS Code terminal from VSCODE_IPC_HOOK_CLI", () => {
    const profile = detectTerminalProfile("win32", {
      VSCODE_IPC_HOOK_CLI: "some-value",
    });
    expect(profile).toBe("windows-vscode");
  });

  it("prefers VS Code detection over PowerShell on Windows", () => {
    const profile = detectTerminalProfile("win32", {
      PSModulePath: "C:\\Modules",
      TERM_PROGRAM: "vscode",
    });
    expect(profile).toBe("windows-vscode");
  });

  it("returns default profile on Linux", () => {
    const profile = detectTerminalProfile("linux", {});
    expect(profile).toBe("default");
  });

  it("returns default profile on Darwin", () => {
    const profile = detectTerminalProfile("darwin", {});
    expect(profile).toBe("default");
  });

  it("returns default profile when platform is not win32", () => {
    const profile = detectTerminalProfile("aix", { TERM_PROGRAM: "vscode" });
    expect(profile).toBe("default");
  });
});
