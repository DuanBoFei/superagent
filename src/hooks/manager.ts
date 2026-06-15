import { createSafeHookError } from "./errors";
import { executeHook } from "./executor";
import { hookMatchesEvent } from "./matcher";
import { isBlockingHookEvent, isObserveOnlyHookEvent } from "./types";
import type { Config } from "../config/types";
import type { HookConfig, HookEvent, HookEventName, HookResult } from "./types";

type EnabledHookConfig = Extract<HookConfig, { enabled: true }>;

type HookExecutor = (hook: EnabledHookConfig, event: HookEvent) => Promise<HookResult>;

export interface HookDispatchResult {
  decision: "continue" | "block";
  message?: string;
  results: Array<{
    hook: EnabledHookConfig;
    result: HookResult;
  }>;
}

export interface HookManager {
  dispatch(eventName: HookEventName, event: HookEvent): Promise<HookDispatchResult>;
}

export function createHookManager(
  config: Config,
  deps: { execute?: HookExecutor } = {},
): HookManager {
  const execute = deps.execute ?? executeHook;

  return {
    async dispatch(eventName, event) {
      const results: HookDispatchResult["results"] = [];
      const hooks = config.hooks[eventName] ?? [];

      for (const hook of hooks) {
        if (!hook.enabled) continue;
        if (!hookMatchesEvent(hook, eventName, event)) continue;

        const result = await execute(hook, event);
        const normalizedResult = normalizeResultForEvent(eventName, result);
        results.push({ hook, result: normalizedResult });

        if (normalizedResult.decision === "block" && isBlockingHookEvent(eventName)) {
          return {
            decision: "block",
            ...(normalizedResult.message ? { message: normalizedResult.message } : {}),
            results,
          };
        }
      }

      return { decision: "continue", results };
    },
  };
}

function normalizeResultForEvent(eventName: HookEventName, result: HookResult): HookResult {
  if (result.decision !== "block" || !isObserveOnlyHookEvent(eventName)) return result;

  return {
    ...result,
    ok: false,
    decision: "continue",
    error: createSafeHookError("OBSERVE_ONLY_BLOCK", result.message ?? "observe-only hook returned block"),
  };
}
