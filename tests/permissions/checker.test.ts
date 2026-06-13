import { describe, expect, it, vi } from "vitest";
import { createChecker } from "../../src/permissions/checker";
import type { PermissionsConfig, PromptFn } from "../../src/permissions/types";

function config(overrides?: Partial<PermissionsConfig>): PermissionsConfig {
  return {
    autoApprove: ["Read:*", "Glob:*", "Grep:*"],
    deny: [],
    askTimeout: 30000,
    ...overrides,
  };
}

describe("createChecker", () => {
  it("autoApprove matched → approved without prompt", async () => {
    const promptFn = vi.fn<PromptFn>();
    const checker = createChecker(config(), promptFn);

    const result = await checker.checkPermission("Read", {
      file_path: "src/file.ts",
    });

    expect(result).toBe("approved");
    expect(promptFn).not.toHaveBeenCalled();
  });

  it("deny matched → denied without prompt", async () => {
    const promptFn = vi.fn<PromptFn>();
    const checker = createChecker(
      config({ deny: ["Bash:rm *"] }),
      promptFn,
    );

    const result = await checker.checkPermission("Bash", {
      command: "rm -rf build/",
    });

    expect(result).toBe("denied");
    expect(promptFn).not.toHaveBeenCalled();
  });

  it("deny wins over autoApprove when both match", async () => {
    const promptFn = vi.fn<PromptFn>();
    const checker = createChecker(
      config({
        autoApprove: ["Bash:*"],
        deny: ["Bash:rm *"],
      }),
      promptFn,
    );

    const result = await checker.checkPermission("Bash", {
      command: "rm file.txt",
    });

    expect(result).toBe("denied");
    expect(promptFn).not.toHaveBeenCalled();
  });

  it("blacklist forces ask even with autoApprove", async () => {
    const promptFn = vi.fn<PromptFn>().mockResolvedValue("approved");
    const checker = createChecker(
      config({ autoApprove: ["Bash:*"] }),
      promptFn,
    );

    const result = await checker.checkPermission("Bash", {
      command: "sudo rm -rf /",
    });

    expect(result).toBe("approved");
    expect(promptFn).toHaveBeenCalledTimes(1);
  });

  it("neither matched → calls promptFn", async () => {
    const promptFn = vi.fn<PromptFn>().mockResolvedValue("approved");
    const checker = createChecker(config(), promptFn);

    const result = await checker.checkPermission("Bash", {
      command: "npm test",
    });

    expect(result).toBe("approved");
    expect(promptFn).toHaveBeenCalledWith("Bash", "npm test");
  });

  it("promptFn denied → returns denied", async () => {
    const promptFn = vi.fn<PromptFn>().mockResolvedValue("denied");
    const checker = createChecker(config(), promptFn);

    const result = await checker.checkPermission("Bash", {
      command: "npm test",
    });

    expect(result).toBe("denied");
  });

  it("promptFn returns always → approved and pattern added to autoApprove", async () => {
    const promptFn = vi.fn<PromptFn>().mockResolvedValue("always");
    const checker = createChecker(config(), promptFn);

    // First call: prompt returns "always"
    const result1 = await checker.checkPermission("Bash", {
      command: "npm test",
    });
    expect(result1).toBe("approved");

    // Second call with same tool+args: now auto-approved without prompt
    const promptFn2 = vi.fn<PromptFn>();
    // First we need a new checker with the old prompt to verify
    // But the "always" adds to in-memory, so let's test within same checker
    promptFn.mockClear();

    const result2 = await checker.checkPermission("Bash", {
      command: "npm test",
    });
    expect(result2).toBe("approved");
    expect(promptFn).not.toHaveBeenCalled();
  });

  it("timeout → denied", async () => {
    const infinitePrompt = () =>
      new Promise<"approved">(() => {
        /* never resolves */
      });
    const checker = createChecker(
      config({ askTimeout: 100 }),
      infinitePrompt,
    );

    const result = await checker.checkPermission("Bash", {
      command: "slow-command",
    });

    expect(result).toBe("denied");
  });

  it("logs decisions as events", async () => {
    const promptFn = vi.fn<PromptFn>().mockResolvedValue("approved");
    const checker = createChecker(config(), promptFn);

    await checker.checkPermission("Read", { file_path: "src/x.ts" });
    await checker.checkPermission("Bash", { command: "git status" });

    const events = checker.getEvents();
    expect(events.length).toBe(2);
    expect(events[0]!.decision).toBe("approved");
    expect(events[0]!.toolName).toBe("Read");
    expect(events[0]!.matchedRule).toBe("Read:*");
    expect(events[1]!.decision).toBe("approved");
    expect(events[1]!.toolName).toBe("Bash");
  });

  it("redacts API keys in logged events", async () => {
    const promptFn = vi.fn<PromptFn>().mockResolvedValue("denied");
    const checker = createChecker(config({ deny: ["Bash:*"] }), promptFn);

    await checker.checkPermission("Bash", {
      command: 'curl -H "Authorization: Bearer sk-abc123"',
    });

    const events = checker.getEvents();
    expect(events.length).toBe(1);
    expect(events[0]!.argsSummary).not.toContain("sk-abc123");
    expect(events[0]!.argsSummary).toContain("sk-****");
  });
});
