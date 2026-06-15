import { describe, expect, it } from "vitest";
import {
  createPostToolUseEvent,
  createPostToolUseFailureEvent,
  createPreCompactEvent,
  createPreToolUseEvent,
  createSessionStartEvent,
  createStopEvent,
  createUserPromptSubmitEvent,
} from "../../src/hooks/events";

const base = {
  sessionId: "session-1",
  turnId: "turn-1",
  cwd: "/repo",
  timestamp: "2026-06-14T12:00:00.000Z",
};

describe("hook lifecycle event builders", () => {
  it("builds SessionStart events", () => {
    expect(createSessionStartEvent({ ...base, resumed: true })).toEqual({
      event: "SessionStart",
      sessionId: "session-1",
      turnId: "turn-1",
      timestamp: "2026-06-14T12:00:00.000Z",
      cwd: "/repo",
      payload: {
        resumed: true,
      },
    });
  });

  it("builds UserPromptSubmit events", () => {
    expect(createUserPromptSubmitEvent({ ...base, prompt: "deploy production" })).toEqual({
      event: "UserPromptSubmit",
      sessionId: "session-1",
      turnId: "turn-1",
      timestamp: "2026-06-14T12:00:00.000Z",
      cwd: "/repo",
      payload: {
        prompt: "deploy production",
      },
    });
  });

  it("builds PreToolUse events", () => {
    expect(
      createPreToolUseEvent({
        ...base,
        toolName: "Bash",
        input: { command: "git status" },
        permissionKey: "Bash",
      }),
    ).toEqual({
      event: "PreToolUse",
      sessionId: "session-1",
      turnId: "turn-1",
      timestamp: "2026-06-14T12:00:00.000Z",
      cwd: "/repo",
      payload: {
        toolName: "Bash",
        input: { command: "git status" },
        permissionKey: "Bash",
      },
    });
  });

  it("builds PostToolUse events", () => {
    expect(
      createPostToolUseEvent({
        ...base,
        toolName: "Read",
        input: { file_path: "README.md" },
        permissionKey: "Read",
        result: { output: "hello" },
      }),
    ).toEqual({
      event: "PostToolUse",
      sessionId: "session-1",
      turnId: "turn-1",
      timestamp: "2026-06-14T12:00:00.000Z",
      cwd: "/repo",
      payload: {
        toolName: "Read",
        input: { file_path: "README.md" },
        permissionKey: "Read",
        result: { output: "hello" },
      },
    });
  });

  it("builds PostToolUseFailure events", () => {
    expect(
      createPostToolUseFailureEvent({
        ...base,
        toolName: "Read",
        input: { file_path: "missing.md" },
        permissionKey: "Read",
        error: "File not found",
      }),
    ).toEqual({
      event: "PostToolUseFailure",
      sessionId: "session-1",
      turnId: "turn-1",
      timestamp: "2026-06-14T12:00:00.000Z",
      cwd: "/repo",
      payload: {
        toolName: "Read",
        input: { file_path: "missing.md" },
        permissionKey: "Read",
        error: "File not found",
      },
    });
  });

  it("builds PreCompact events", () => {
    expect(createPreCompactEvent({ ...base, reason: "token_threshold" })).toEqual({
      event: "PreCompact",
      sessionId: "session-1",
      turnId: "turn-1",
      timestamp: "2026-06-14T12:00:00.000Z",
      cwd: "/repo",
      payload: {
        reason: "token_threshold",
      },
    });
  });

  it("builds Stop events", () => {
    expect(createStopEvent({ ...base, reason: "user_exit" })).toEqual({
      event: "Stop",
      sessionId: "session-1",
      turnId: "turn-1",
      timestamp: "2026-06-14T12:00:00.000Z",
      cwd: "/repo",
      payload: {
        reason: "user_exit",
      },
    });
  });
});
