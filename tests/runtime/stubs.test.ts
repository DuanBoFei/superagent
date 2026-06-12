import { describe, expect, it } from "vitest";
import { composePrompt } from "../../src/runtime/stubs/context";
import { sendMessage } from "../../src/runtime/stubs/model";
import { dispatchTools } from "../../src/runtime/stubs/tools";
import { checkPermission } from "../../src/runtime/stubs/permission";
import { saveSession } from "../../src/runtime/stubs/session";
import { emit } from "../../src/runtime/stubs/observe";

describe("Stub modules", () => {
  it("composePrompt returns prompt with system and messages", () => {
    const result = composePrompt([{ role: "user", content: "hi" }]);
    expect(result.system).toBeDefined();
    expect(result.messages).toHaveLength(1);
  });

  it("sendMessage yields stub text token", async () => {
    const prompt = { system: "test", messages: [] };
    const stream = sendMessage(prompt);
    const { value, done } = await stream.next();
    expect(done).toBe(false);
    expect(value!.type).toBe("text");
    expect(value!.content).toBe("This is a stub response.");
  });

  it("dispatchTools returns stub results for each call", async () => {
    const results = await dispatchTools([
      { name: "Read", args: { file_path: "/f.ts" } },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]!.success).toBe(true);
    expect(results[0]!.output).toContain("[STUB]");
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
