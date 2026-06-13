import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { composePrompt } from "../../src/context/composer";
import type {
  ContextMessage,
  PromptContext,
  ToolDef,
} from "../../src/context/types";

const tmpDir = __dirname;
const rulesFile = join(tmpDir, "_test_composer_rules.md");

function makeMsg(
  role: "user" | "assistant" | "system",
  content: string,
  timestamp: number,
  toolResults?: ContextMessage["toolResults"],
): ContextMessage {
  return { role, content, timestamp, toolResults };
}

function makeContext(
  overrides?: Partial<PromptContext>,
): PromptContext {
  return {
    rulesFilePath: rulesFile,
    toolDefinitions: [],
    contextWindowTokens: 128_000,
    currentTokens: 0,
    ...overrides,
  };
}

const sampleToolDefs: ToolDef[] = [
  {
    name: "Read",
    description: "Read a file from the filesystem",
    parameters: {
      file_path: { type: "string", description: "Path to file", required: true },
    },
    concurrencySafe: true,
  },
  {
    name: "Bash",
    description: "Execute a shell command",
    parameters: {
      command: { type: "string", description: "Command to run", required: true },
    },
    concurrencySafe: false,
  },
];

describe("Composer", () => {
  beforeEach(() => {
    if (existsSync(rulesFile)) unlinkSync(rulesFile);
  });

  afterEach(() => {
    if (existsSync(rulesFile)) unlinkSync(rulesFile);
  });

  it("fresh session: system prompt only, no history", () => {
    const msgs = [makeMsg("user", "Hello", Date.now())];
    const result = composePrompt(msgs, makeContext());

    expect(result.system).toContain("SuperAgent");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.content).toBe("Hello");
    expect(result.compacted).toBe(false);
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });

  it("includes CLAUDE.md rules when file exists", () => {
    writeFileSync(rulesFile, "# Test Rules\nUse 4-space indentation.", "utf-8");

    const msgs = [makeMsg("user", "Hi", Date.now())];
    const result = composePrompt(msgs, makeContext());

    expect(result.system).toContain("## Project Rules");
    expect(result.system).toContain("# Test Rules");
    expect(result.system).toContain("Use 4-space indentation");
  });

  it("silently skips rules when file is missing", () => {
    // Ensure file doesn't exist
    if (existsSync(rulesFile)) unlinkSync(rulesFile);

    const msgs = [makeMsg("user", "Hi", Date.now())];
    const result = composePrompt(msgs, makeContext());

    expect(result.system).not.toContain("## Project Rules");
    expect(result.compacted).toBe(false);
  });

  it("includes tool definitions in system prompt", () => {
    const msgs = [makeMsg("user", "read a file", Date.now())];
    const result = composePrompt(
      msgs,
      makeContext({ toolDefinitions: sampleToolDefs }),
    );

    expect(result.system).toContain("## Available Tools");
    expect(result.system).toContain("### Read");
    expect(result.system).toContain("### Bash");
    expect(result.system).toContain("[safe for parallel execution]");
  });

  it("triggers compaction when near context window", () => {
    // Create enough messages to exceed 80% of a small window
    const msgs: ContextMessage[] = [];
    const filler = "x".repeat(5000);
    for (let i = 0; i < 30; i++) {
      msgs.push(makeMsg("user", `Question ${i}: ${filler}`, i * 1000));
      msgs.push(
        makeMsg("assistant", `Answer ${i}: ${filler}`, i * 1000 + 500),
      );
    }

    const result = composePrompt(
      msgs,
      makeContext({ contextWindowTokens: 5000 }),
    );

    // Should have compacted with a very small window
    expect(result.compacted).toBe(true);
    expect(result.messages.length).toBeLessThan(msgs.length);
  });

  it("after compaction, total tokens should be below 80% of window (or messages exhausted)", () => {
    const msgs: ContextMessage[] = [];
    const filler = "a".repeat(3000);
    for (let i = 0; i < 20; i++) {
      msgs.push(makeMsg("user", `${filler}`, i * 1000));
      msgs.push(makeMsg("assistant", `${filler}`, i * 1000 + 500));
    }

    const result = composePrompt(
      msgs,
      makeContext({ contextWindowTokens: 5000 }),
    );

    // Either compacted, or hard-truncated
    expect(result.messages.length).toBeLessThanOrEqual(msgs.length);
    expect(result.estimatedTokens).toBeLessThanOrEqual(5000);
  });

  it("no compaction for near-empty history even with small window", () => {
    const msgs = [makeMsg("user", "hi", Date.now())];

    const result = composePrompt(
      msgs,
      makeContext({ contextWindowTokens: 100 }),
    );

    // Won't compact because only 1 message, but may hard truncate
    expect(result.compacted).toBe(false);
  });

  it("system prompt precedes CLAUDE.md which precedes tool defs", () => {
    writeFileSync(rulesFile, "# Project Rules Content", "utf-8");

    const msgs = [makeMsg("user", "test", Date.now())];
    const result = composePrompt(
      msgs,
      makeContext({ toolDefinitions: sampleToolDefs }),
    );

    const spIndex = result.system.indexOf("SuperAgent");
    const rulesIndex = result.system.indexOf("## Project Rules");
    const toolsIndex = result.system.indexOf("## Available Tools");

    expect(spIndex).toBeLessThan(rulesIndex);
    expect(rulesIndex).toBeLessThan(toolsIndex);
  });
});
