export const HOOK_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PreCompact",
  "Stop",
] as const;

export const BLOCKING_HOOK_EVENTS = ["UserPromptSubmit", "PreToolUse"] as const;

export const OBSERVE_ONLY_HOOK_EVENTS = [
  "SessionStart",
  "PostToolUse",
  "PostToolUseFailure",
  "PreCompact",
  "Stop",
] as const;

export type HookEventName = (typeof HOOK_EVENTS)[number];
export type BlockingHookEventName = (typeof BLOCKING_HOOK_EVENTS)[number];
export type ObserveOnlyHookEventName = (typeof OBSERVE_ONLY_HOOK_EVENTS)[number];

export interface HookMatcher {
  tool?: string;
  inputPattern?: string;
  promptPattern?: string;
}

export type HookConfig =
  | {
      name: string;
      enabled: true;
      command: string;
      args: string[];
      env: Record<string, string>;
      timeoutMs: number;
      blocking?: boolean;
      matcher?: HookMatcher;
    }
  | {
      name: string;
      enabled: false;
      command?: string;
      args: string[];
      env: Record<string, string>;
      timeoutMs: number;
      blocking?: boolean;
      matcher?: HookMatcher;
    };

interface BaseHookEvent<TEvent extends HookEventName, TPayload extends Record<string, unknown>> {
  event: TEvent;
  sessionId: string;
  turnId?: string;
  timestamp: string;
  cwd: string;
  payload: TPayload;
}

export type SessionStartHookEvent = BaseHookEvent<
  "SessionStart",
  {
    resumed?: boolean;
  }
>;

export type UserPromptSubmitHookEvent = BaseHookEvent<
  "UserPromptSubmit",
  {
    prompt: string;
  }
>;

export type PreToolUseHookEvent = BaseHookEvent<
  "PreToolUse",
  {
    toolName: string;
    input: Record<string, unknown>;
    permissionKey?: string;
  }
>;

export type PostToolUseHookEvent = BaseHookEvent<
  "PostToolUse",
  {
    toolName: string;
    input: Record<string, unknown>;
    permissionKey?: string;
    result: unknown;
  }
>;

export type PostToolUseFailureHookEvent = BaseHookEvent<
  "PostToolUseFailure",
  {
    toolName: string;
    input: Record<string, unknown>;
    permissionKey?: string;
    error: string;
  }
>;

export type PreCompactHookEvent = BaseHookEvent<
  "PreCompact",
  {
    reason: string;
  }
>;

export type StopHookEvent = BaseHookEvent<
  "Stop",
  {
    reason?: string;
  }
>;

export type HookEvent =
  | SessionStartHookEvent
  | UserPromptSubmitHookEvent
  | PreToolUseHookEvent
  | PostToolUseHookEvent
  | PostToolUseFailureHookEvent
  | PreCompactHookEvent
  | StopHookEvent;

export interface HookExecution {
  hookName: string;
  event: HookEventName;
  command: string;
  args: string[];
  startedAt: string;
}

export interface HookSafeError {
  code: string;
  message: string;
  detail?: string;
}

export interface HookResult {
  ok: boolean;
  decision: "continue" | "block";
  message?: string;
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode?: number;
  error?: HookSafeError;
}

export function isBlockingHookEvent(event: HookEventName): event is BlockingHookEventName {
  return (BLOCKING_HOOK_EVENTS as readonly HookEventName[]).includes(event);
}

export function isObserveOnlyHookEvent(event: HookEventName): event is ObserveOnlyHookEventName {
  return (OBSERVE_ONLY_HOOK_EVENTS as readonly HookEventName[]).includes(event);
}
