import { createSafeHookError, redactHookSecrets } from "./errors";
import { executeHook } from "./executor";
import { hookMatchesEvent } from "./matcher";
import { isBlockingHookEvent, isObserveOnlyHookEvent } from "./types";
import type { Config } from "../config/types";
import type { LogEvent } from "../observability/types";
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
  deps: { execute?: HookExecutor; emit?: (event: LogEvent) => void } = {},
): HookManager {
  const execute = deps.execute ?? executeHook;
  const emit = deps.emit;

  return {
    async dispatch(eventName, event) {
      const results: HookDispatchResult["results"] = [];
      const hooks = config.hooks[eventName] ?? [];

      for (const hook of hooks) {
        if (!hook.enabled) continue;
        if (!hookMatchesEvent(hook, eventName, event)) continue;

        emit?.({ type: "hook:start", hookName: hook.name, hookEvent: eventName });
        const result = await execute(hook, event);
        const normalizedResult = normalizeResultForEvent(eventName, result);
        results.push({ hook, result: normalizedResult });
        emitHookResult(emit, eventName, hook, normalizedResult);

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

function emitHookResult(
  emit: ((event: LogEvent) => void) | undefined,
  eventName: HookEventName,
  hook: EnabledHookConfig,
  result: HookResult,
): void {
  if (!emit) return;

  const base = {
    hookName: hook.name,
    hookEvent: eventName,
    durationMs: result.durationMs,
    ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
    decision: result.decision,
  };
  const diagnostics = {
    ...(result.stdout ? { stdout: redactHookSecrets(result.stdout) } : {}),
    ...(result.stderr ? { stderr: redactHookSecrets(result.stderr) } : {}),
  };

  if (result.ok) {
    emit({ type: "hook:end", ...base, ...diagnostics });
  } else {
    emit({
      type: "hook:failure",
      ...base,
      ...diagnostics,
      ...(result.error ? { error: redactHookError(result.error) } : {}),
    });
  }

  if (result.decision === "block" && isBlockingHookEvent(eventName)) {
    emit({
      type: "hook:block",
      ...base,
      decision: "block",
      ...(result.message ? { message: redactHookSecrets(result.message) } : {}),
    });
  }
}

function redactHookError(error: NonNullable<HookResult["error"]>): NonNullable<HookResult["error"]> {
  return {
    code: error.code,
    message: redactHookSecrets(error.message),
    ...(error.detail ? { detail: redactHookSecrets(error.detail) } : {}),
  };
}
