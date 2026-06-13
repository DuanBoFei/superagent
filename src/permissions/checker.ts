import { BLACKLIST } from "./blacklist";
import { matchPattern } from "./matcher";
import type {
  PermissionEvent,
  PermissionResult,
  PermissionsConfig,
  PromptFn,
} from "./types";

function redactKeys(str: string): string {
  return str.replace(/sk-[a-zA-Z0-9]+/g, "sk-****");
}

function matchesAny(
  toolName: string,
  args: Record<string, unknown>,
  patterns: readonly string[],
): string | null {
  for (const p of patterns) {
    if (matchPattern(toolName, args, p)) return p;
  }
  return null;
}

export function createChecker(
  config: PermissionsConfig,
  promptFn: PromptFn,
) {
  const events: PermissionEvent[] = [];
  const autoApprove: string[] = [...config.autoApprove];

  function log(
    toolName: string,
    argsSummary: string,
    decision: PermissionResult,
    matchedRule?: string,
  ) {
    events.push({
      toolName,
      argsSummary: redactKeys(argsSummary),
      decision,
      matchedRule,
      timestamp: Date.now(),
    });
  }

  function buildArgsSummary(args: Record<string, unknown>): string {
    return Object.values(args).map(String).join(" ");
  }

  async function checkPermission(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<PermissionResult> {
    const summary = buildArgsSummary(args);

    // Step 1: Check hard-coded blacklist → force ask
    const blacklistMatch = matchesAny(toolName, args, BLACKLIST);
    if (blacklistMatch) {
      const result = await promptWithTimeout(toolName, summary);
      log(toolName, summary, result, `blacklist:${blacklistMatch}`);
      return result;
    }

    // Step 2: Check deny patterns
    const denyMatch = matchesAny(toolName, args, config.deny);
    if (denyMatch) {
      log(toolName, summary, "denied", denyMatch);
      return "denied";
    }

    // Step 3: Check auto-approve patterns
    const autoMatch = matchesAny(toolName, args, autoApprove);
    if (autoMatch) {
      log(toolName, summary, "approved", autoMatch);
      return "approved";
    }

    // Step 4: Neither → ask
    const promptResult = await promptWithTimeout(toolName, summary);

    if (promptResult === "always") {
      const newPattern = `${toolName}:${summary}`;
      autoApprove.push(newPattern);
      log(toolName, summary, "approved", newPattern);
      return "approved";
    }

    log(toolName, summary, promptResult);
    return promptResult;
  }

  async function promptWithTimeout(
    toolName: string,
    command: string,
  ): Promise<PermissionResult> {
    const result = await Promise.race([
      promptFn(toolName, command),
      new Promise<PermissionResult>((resolve) =>
        setTimeout(() => resolve("denied"), config.askTimeout),
      ),
    ]);
    return result;
  }

  return {
    checkPermission,
    getEvents: () => events,
  };
}
