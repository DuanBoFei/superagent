import { describe, expect, it } from "vitest";
import { executeHook } from "../../src/hooks/executor";
import { createSessionStartEvent } from "../../src/hooks/events";
import type { HookConfig } from "../../src/hooks/types";

const event = createSessionStartEvent({
  sessionId: "session-1",
  turnId: "turn-1",
  cwd: "/repo",
  timestamp: "2026-06-14T12:00:00.000Z",
  resumed: true,
});

function hook(overrides: Partial<Extract<HookConfig, { enabled: true }>> = {}): Extract<HookConfig, { enabled: true }> {
  return {
    name: "policy",
    enabled: true,
    command: process.execPath,
    args: [],
    env: {},
    timeoutMs: 3000,
    ...overrides,
  };
}

describe("local command hook executor", () => {
  it("sends hook event JSON through stdin and parses continue output", async () => {
    const result = await executeHook(
      hook({
        args: [
          "-e",
          "let data=''; process.stdin.on('data', c => data += c); process.stdin.on('end', () => { const event = JSON.parse(data); process.stdout.write(JSON.stringify({ decision: 'continue', message: event.payload.resumed ? 'resumed' : 'fresh' })); });",
        ],
      }),
      event,
    );

    expect(result.ok).toBe(true);
    expect(result.decision).toBe("continue");
    expect(result.message).toBe("resumed");
    expect(result.exitCode).toBe(0);
  });

  it("parses blocking output", async () => {
    const result = await executeHook(
      hook({ args: ["-e", "process.stdout.write(JSON.stringify({ decision: 'block', message: 'denied' }));"] }),
      event,
    );

    expect(result.ok).toBe(true);
    expect(result.decision).toBe("block");
    expect(result.message).toBe("denied");
  });

  it("normalizes non-zero command exits without throwing", async () => {
    const result = await executeHook(
      hook({ args: ["-e", "process.stderr.write('api_key=sk-test123'); process.exit(2);"] }),
      event,
    );

    expect(result.ok).toBe(false);
    expect(result.decision).toBe("continue");
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toBe("api_key=[REDACTED]");
    expect(result.error).toEqual({
      code: "NON_ZERO_EXIT",
      message: "Hook command exited with a non-zero status",
      detail: "exitCode=2 stderr=api_key=[REDACTED]",
    });
  });

  it("normalizes invalid JSON stdout", async () => {
    const result = await executeHook(hook({ args: ["-e", "process.stdout.write('{not-json');"] }), event);

    expect(result.ok).toBe(false);
    expect(result.decision).toBe("continue");
    expect(result.error?.code).toBe("INVALID_JSON");
  });

  it("enforces timeout and terminates the process", async () => {
    const result = await executeHook(
      hook({ args: ["-e", "setTimeout(() => process.stdout.write('late'), 1000);"], timeoutMs: 50 }),
      event,
    );

    expect(result.ok).toBe(false);
    expect(result.decision).toBe("continue");
    expect(result.error?.code).toBe("TIMEOUT");
  });
});
