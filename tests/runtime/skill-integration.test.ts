import { describe, expect, it } from "vitest";
import { composePrompt } from "../../src/context/composer";
import { SYSTEM_PROMPT } from "../../src/context/system-prompt";
import { renderSkillContext } from "../../src/skills/prompt";
import { discoverSkills } from "../../src/skills/discovery";
import type { PromptContext, ContextMessage } from "../../src/context/types";
import type { SkillDefinition } from "../../src/skills/types";
import { createSkillManifest, createSkillDefinition } from "../../src/skills/types";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("T025: skill discovery in runtime startup", () => {
  it("discovers skills from configured directories", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc-"));
    try {
      const skillDir = path.join(dir, "my-skill");
      fs.mkdirSync(skillDir);
      fs.writeFileSync(
        path.join(skillDir, "SKILL.md"),
        [
          "---",
          "name: my-skill",
          "version: 1.2.3",
          "description: A test skill",
          "---",
          "# Instructions",
          "Do the thing.",
        ].join("\n"),
        "utf-8",
      );

      const result = discoverSkills([dir], { maxBodySize: 65536 });

      expect(result.registry.skills.size).toBe(1);
      expect(result.registry.skills.has("my-skill")).toBe(true);
      expect(result.registry.sourceOrder).toEqual([dir]);
      expect(result.diagnostics).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns diagnostic for duplicate skill names (first wins)", () => {
    const dir1 = fs.mkdtempSync(path.join(os.tmpdir(), "skill-dup-a-"));
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "skill-dup-b-"));
    try {
      for (const d of [dir1, dir2]) {
        const skillDir = path.join(d, "dup-skill");
        fs.mkdirSync(skillDir);
        fs.writeFileSync(
          path.join(skillDir, "SKILL.md"),
          [
            "---",
            "name: dup-skill",
            "version: 1.0.0",
            `description: From ${d}`,
            "---",
            "# Instructions",
            "Do the thing.",
          ].join("\n"),
          "utf-8",
        );
      }

      const result = discoverSkills([dir1, dir2], { maxBodySize: 65536 });

      expect(result.registry.skills.size).toBe(1);
      expect(result.registry.skills.has("dup-skill")).toBe(true);
      expect(result.diagnostics.length).toBe(1);
      expect(result.diagnostics[0].skillName).toBe("dup-skill");
      expect(result.diagnostics[0].reason).toBe("duplicate-name");
    } finally {
      fs.rmSync(dir1, { recursive: true, force: true });
      fs.rmSync(dir2, { recursive: true, force: true });
    }
  });

  it("returns empty registry when no directories configured", () => {
    const result = discoverSkills([], { maxBodySize: 65536 });
    expect(result.registry.skills.size).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });
});

describe("T028: skill context injection", () => {
  const skill: SkillDefinition = createSkillDefinition(
    createSkillManifest({
      name: "test-skill",
      version: "1.0.0",
      description: "Test skill for context injection",
      arguments: [
        { name: "input", description: "Input file", required: true },
        { name: "flag", description: "Optional flag", required: false },
      ],
    }),
    "Run the tests with the provided input.",
  );

  it("injects skill context into prompt when skillContext is present", () => {
    const contextBlock = renderSkillContext(skill, { input: "foo.ts", flag: "true" });
    const messages: ContextMessage[] = [];
    const context: PromptContext = {
      rulesFilePath: "CLAUDE.md",
      toolDefinitions: [],
      contextWindowTokens: 128_000,
      currentTokens: 0,
      skillContext: contextBlock,
    };

    const prompt = composePrompt(messages, context);

    expect(prompt.system).toContain("<!-- SKILL CONTEXT BEGIN -->");
    expect(prompt.system).toContain("<!-- SKILL CONTEXT END -->");
    expect(prompt.system).toContain("test-skill");
    expect(prompt.system).toContain("Test skill for context injection");
    expect(prompt.system).toContain("foo.ts");
    expect(prompt.system).toContain("Run the tests with the provided input.");
  });

  it("skill context appears between rules (Layer 2) and tool defs (Layer 3)", () => {
    const contextBlock = renderSkillContext(skill, { input: "bar.ts" });
    const messages: ContextMessage[] = [];
    const context: PromptContext = {
      rulesFilePath: "CLAUDE.md",
      toolDefinitions: [],
      contextWindowTokens: 128_000,
      currentTokens: 0,
      skillContext: contextBlock,
    };

    const prompt = composePrompt(messages, context);

    const skillPos = prompt.system.indexOf("<!-- SKILL CONTEXT BEGIN -->");
    const sysEnd = prompt.system.indexOf(SYSTEM_PROMPT) + SYSTEM_PROMPT.length;
    expect(skillPos).toBeGreaterThan(sysEnd);
  });

  it("omits skill context block when not provided", () => {
    const messages: ContextMessage[] = [];
    const context: PromptContext = {
      rulesFilePath: "CLAUDE.md",
      toolDefinitions: [],
      contextWindowTokens: 128_000,
      currentTokens: 0,
    };

    const prompt = composePrompt(messages, context);

    expect(prompt.system).not.toContain("<!-- SKILL CONTEXT BEGIN -->");
    expect(prompt.system).not.toContain("<!-- SKILL CONTEXT END -->");
  });

  it("token estimate includes skill context", () => {
    const contextBlock = renderSkillContext(skill, { input: "test.ts" });
    const messages: ContextMessage[] = [];
    const contextWithout: PromptContext = {
      rulesFilePath: "CLAUDE.md",
      toolDefinitions: [],
      contextWindowTokens: 128_000,
      currentTokens: 0,
    };
    const contextWith: PromptContext = {
      ...contextWithout,
      skillContext: contextBlock,
    };

    const without = composePrompt(messages, contextWithout);
    const withSkill = composePrompt(messages, contextWith);

    expect(withSkill.estimatedTokens).toBeGreaterThan(without.estimatedTokens);
  });
});

describe("T029: skill tool guidance and permissions", () => {
  it("tools defined in system prompt are included alongside skill context", () => {
    const skill: SkillDefinition = createSkillDefinition(
      createSkillManifest({
        name: "tool-skill",
        version: "1.0.0",
        description: "Skill that uses tools",
      }),
      "Use Read and Grep tools to analyze code.",
    );
    const contextBlock = renderSkillContext(skill, {});
    const messages: ContextMessage[] = [];
    const context: PromptContext = {
      rulesFilePath: "CLAUDE.md",
      toolDefinitions: [
        { name: "Read", description: "Read a file", parameters: {}, concurrencySafe: true },
        { name: "Grep", description: "Search code", parameters: {}, concurrencySafe: true },
      ],
      contextWindowTokens: 128_000,
      currentTokens: 0,
      skillContext: contextBlock,
    };

    const prompt = composePrompt(messages, context);

    // Skill context is injected, and tools are still present
    expect(prompt.system).toContain("<!-- SKILL CONTEXT BEGIN -->");
    expect(prompt.system).toContain("### Read");
    expect(prompt.system).toContain("### Grep");

    // Skill context layer (2.5) is before tool defs layer (3)
    const skillPos = prompt.system.indexOf("<!-- SKILL CONTEXT BEGIN -->");
    const toolsPos = prompt.system.indexOf("## Available Tools");
    expect(skillPos).toBeLessThan(toolsPos);
  });
});

describe("T031: skill invocation persistence", () => {
  it("renderSkillContext includes args that can be replayed", () => {
    const skill: SkillDefinition = createSkillDefinition(
      createSkillManifest({
        name: "persist-skill",
        version: "2.0.0",
        description: "Skill with traceable args",
        arguments: [
          { name: "target", description: "Target directory", required: true },
          { name: "verbose", description: "Verbose output", required: false },
        ],
      }),
      "Process the target directory.",
    );

    const args = { target: "./src", verbose: "true" };
    const contextBlock = renderSkillContext(skill, args);

    // The rendered context contains enough info to replay the invocation
    expect(contextBlock).toContain("persist-skill");
    expect(contextBlock).toContain("2.0.0");
    expect(contextBlock).toContain("./src");
    expect(contextBlock).toContain("true");

    const messages: ContextMessage[] = [];
    const context: PromptContext = {
      rulesFilePath: "CLAUDE.md",
      toolDefinitions: [],
      contextWindowTokens: 128_000,
      currentTokens: 0,
      skillContext: contextBlock,
    };

    const prompt = composePrompt(messages, context);

    // Context block with invocation details is embedded in the prompt
    expect(prompt.system).toContain("persist-skill");
    expect(prompt.system).toContain("target");
    expect(prompt.system).toContain("./src");
  });
});
