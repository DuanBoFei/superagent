import { describe, expect, it } from "vitest";
import { compact } from "../../src/context/compactor";
import type { ContextMessage } from "../../src/context/types";

function makeMsg(
  role: "user" | "assistant" | "system",
  content: string,
  timestamp: number,
  toolResults?: ContextMessage["toolResults"],
): ContextMessage {
  return { role, content, timestamp, toolResults };
}

function countTokens(msgs: ContextMessage[]): number {
  let t = 0;
  for (const m of msgs) {
    t += Math.ceil(m.content.length / 4);
    if (m.toolResults) {
      for (const r of m.toolResults) {
        t += Math.ceil(r.output.length / 4);
      }
    }
  }
  return t;
}

describe("Compactor", () => {
  it("returns unchanged for a single message", () => {
    const msgs = [makeMsg("user", "hello", 1)];
    const result = compact(msgs);
    expect(result.messages).toHaveLength(1);
    expect(result.summary.turnsSummarized).toBe(0);
    expect(result.tokensBefore).toBe(result.tokensAfter);
  });

  it("returns unchanged for empty history", () => {
    const result = compact([]);
    expect(result.messages).toHaveLength(0);
    expect(result.tokensBefore).toBe(0);
  });

  it("reduces tokens for normal history by at least 40%", () => {
    const msgs: ContextMessage[] = [];
    for (let i = 0; i < 20; i++) {
      msgs.push(
        makeMsg("user", `This is user message number ${i} with lots of filler text to simulate a real conversation.`.repeat(3), i * 1000),
      );
      msgs.push(
        makeMsg(
          "assistant",
          `This is assistant response number ${i} analyzing the request and providing code examples.`.repeat(5),
          i * 1000 + 500,
          i % 3 === 0
            ? [{ name: "Read", output: `File content for iteration ${i}:\n` + "line ".repeat(100) }]
            : undefined,
        ),
      );
    }

    const tokensBefore = countTokens(msgs);
    const result = compact(msgs);

    // After compaction: oldest 50% (10 messages) replaced with 1 summary
    expect(result.messages.length).toBeLessThan(msgs.length);
    expect(result.tokensAfter).toBeLessThan(result.tokensBefore);
    expect(result.tokensBefore - result.tokensAfter).toBeGreaterThanOrEqual(
      result.tokensBefore * 0.4,
    );
  });

  it("summary contains modified files", () => {
    const msgs = [
      makeMsg("user", "Fix the bug in auth.ts", 1000),
      makeMsg(
        "assistant",
        "I found the issue. Let me fix it with [Edit] src/auth.ts",
        2000,
        [{ name: "Edit", output: "Modified src/auth.ts: line 42 changed" }],
      ),
      makeMsg(
        "user",
        "Fix the test too for src/utils.ts",
        3000,
      ),
      makeMsg(
        "assistant",
        "OK, updating [Write] tests/auth.test.ts",
        4000,
        [{ name: "Write", output: "Created tests/auth.test.ts with new test" }],
      ),
    ];

    const result = compact(msgs);
    expect(result.summary.modifiedFiles.length).toBeGreaterThan(0);
    // Should find at least one file path
    const fileNames = result.summary.modifiedFiles.join(",");
    expect(fileNames).toMatch(/auth/);
  });

  it("summary contains current goal from last user message", () => {
    const msgs = [
      makeMsg("user", "Old message about something else", 1000),
      makeMsg("assistant", "Response to old message", 2000),
      makeMsg("user", "Current goal: implement the context manager", 3000),
      makeMsg("assistant", "Working on it...", 4000),
    ];

    const result = compact(msgs);
    expect(result.summary.currentGoal).toBe(
      "Current goal: implement the context manager",
    );
  });

  it("summary contains errors encountered", () => {
    const msgs = [
      makeMsg("user", "Run the tests", 1000),
      makeMsg(
        "assistant",
        "Tests failed with error: TypeError: cannot read property 'foo'",
        2000,
        [
          {
            name: "Bash",
            output: "Test run output:\nError: 2 tests failed\nFAIL tests/foo.test.ts",
          },
        ],
      ),
      makeMsg("user", "Fix it", 3000),
      makeMsg("assistant", "Fixed the error", 4000),
    ];

    const result = compact(msgs);
    expect(result.summary.errorsEncountered.length).toBeGreaterThan(0);
  });

  it("compaction result has exactly one summary message + newest block", () => {
    const msgs = [
      makeMsg("user", "msg 1", 1000),
      makeMsg("assistant", "msg 2", 2000),
      makeMsg("user", "msg 3", 3000),
      makeMsg("assistant", "msg 4", 4000),
      makeMsg("user", "msg 5", 5000),
      makeMsg("assistant", "msg 6", 6000),
    ];

    const result = compact(msgs);

    // 6 messages → oldest 3 replaced by summary → 1 summary + 3 newest = 4
    expect(result.messages.length).toBe(4);
    expect(result.messages[0]!.content).toContain("Previous conversation summary");
    expect(result.summary.turnsSummarized).toBe(3);
  });
});
