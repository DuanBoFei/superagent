import type {
  PostToolUseFailureHookEvent,
  PostToolUseHookEvent,
  PreCompactHookEvent,
  PreToolUseHookEvent,
  SessionStartHookEvent,
  StopHookEvent,
  UserPromptSubmitHookEvent,
} from "./types";

interface HookEventBaseInput {
  sessionId: string;
  turnId?: string;
  timestamp: string;
  cwd: string;
}

export function createSessionStartEvent(
  input: HookEventBaseInput & { resumed?: boolean },
): SessionStartHookEvent {
  return {
    event: "SessionStart",
    sessionId: input.sessionId,
    turnId: input.turnId,
    timestamp: input.timestamp,
    cwd: input.cwd,
    payload: {
      resumed: input.resumed,
    },
  };
}

export function createUserPromptSubmitEvent(
  input: HookEventBaseInput & { prompt: string },
): UserPromptSubmitHookEvent {
  return {
    event: "UserPromptSubmit",
    sessionId: input.sessionId,
    turnId: input.turnId,
    timestamp: input.timestamp,
    cwd: input.cwd,
    payload: {
      prompt: input.prompt,
    },
  };
}

export function createPreToolUseEvent(
  input: HookEventBaseInput & {
    toolName: string;
    input: Record<string, unknown>;
    permissionKey?: string;
  },
): PreToolUseHookEvent {
  return {
    event: "PreToolUse",
    sessionId: input.sessionId,
    turnId: input.turnId,
    timestamp: input.timestamp,
    cwd: input.cwd,
    payload: {
      toolName: input.toolName,
      input: input.input,
      permissionKey: input.permissionKey,
    },
  };
}

export function createPostToolUseEvent(
  input: HookEventBaseInput & {
    toolName: string;
    input: Record<string, unknown>;
    permissionKey?: string;
    result: unknown;
  },
): PostToolUseHookEvent {
  return {
    event: "PostToolUse",
    sessionId: input.sessionId,
    turnId: input.turnId,
    timestamp: input.timestamp,
    cwd: input.cwd,
    payload: {
      toolName: input.toolName,
      input: input.input,
      permissionKey: input.permissionKey,
      result: input.result,
    },
  };
}

export function createPostToolUseFailureEvent(
  input: HookEventBaseInput & {
    toolName: string;
    input: Record<string, unknown>;
    permissionKey?: string;
    error: string;
  },
): PostToolUseFailureHookEvent {
  return {
    event: "PostToolUseFailure",
    sessionId: input.sessionId,
    turnId: input.turnId,
    timestamp: input.timestamp,
    cwd: input.cwd,
    payload: {
      toolName: input.toolName,
      input: input.input,
      permissionKey: input.permissionKey,
      error: input.error,
    },
  };
}

export function createPreCompactEvent(
  input: HookEventBaseInput & { reason: string },
): PreCompactHookEvent {
  return {
    event: "PreCompact",
    sessionId: input.sessionId,
    turnId: input.turnId,
    timestamp: input.timestamp,
    cwd: input.cwd,
    payload: {
      reason: input.reason,
    },
  };
}

export function createStopEvent(input: HookEventBaseInput & { reason?: string }): StopHookEvent {
  return {
    event: "Stop",
    sessionId: input.sessionId,
    turnId: input.turnId,
    timestamp: input.timestamp,
    cwd: input.cwd,
    payload: {
      reason: input.reason,
    },
  };
}
