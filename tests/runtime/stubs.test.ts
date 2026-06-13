import { afterEach, describe, expect, it, vi } from "vitest";
import { composePrompt } from "../../src/runtime/stubs/context";
import { sendMessage } from "../../src/runtime/stubs/model";
import { dispatchTools } from "../../src/runtime/stubs/tools";
import { checkPermission } from "../../src/runtime/stubs/permission";
import { saveSession } from "../../src/runtime/stubs/session";
import { emit } from "../../src/runtime/stubs/observe";

function streamResponse(...lines: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(lines.join("\n")));
        controller.close();
      },
    }),
  );
}

describe("Stub modules", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("composePrompt returns prompt with system and messages", () => {
    const result = composePrompt([{ role: "user", content: "hi" }]);
    expect(result.system).toBeDefined();
    expect(result.messages).toHaveLength(1);
  });

  it("sendMessage delegates provider chunks to runtime tokens", async () => {
    vi.stubEnv("SUPERAGENT_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        streamResponse(
          'data: {"choices":[{"delta":{"content":"provider response"}}]}',
          "data: [DONE]",
        ),
      ),
    );

    const prompt = { system: "test", messages: [] };
    const stream = sendMessage(prompt);
    const { value, done } = await stream.next();
    expect(done).toBe(false);
    expect(value).toEqual({ type: "text", content: "provider response" });
  });

  it("dispatchTools returns real tool results for each call", async () => {
    const results = await dispatchTools([
      { name: "Read", args: { file_path: "/f.ts" } },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]!.success).toBe(false);
    expect(results[0]!.output).toBe("");
    expect(results[0]!.error).toBeDefined();
  });

  it("checkPermission returns allowed by default", () => {
    const result = checkPermission("Read", {});
    expect(result.allowed).toBe(true);
  });

  it("saveSession does not throw", () => {
    const state = {
      sessionId: "test",
      turnNumber: 1,
      messages: [],
      toolResults: [],
      state: "IDLE" as const,
      interruptFlag: false,
      startedAt: Date.now(),
    };
    expect(() => saveSession(state)).not.toThrow();
  });

  it("emit does not throw", () => {
    expect(() => emit({ type: "text", content: "hello" })).not.toThrow();
  });
});
