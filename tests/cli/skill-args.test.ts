import { describe, expect, it } from "vitest";
import { parseSkillArgs } from "../../src/cli/skill-args";
import { createSkillManifest, createSkillDefinition, createSkillRegistry } from "../../src/skills/types";

describe("T038: CLI /skill argument parsing", () => {
  describe("named arguments (key=value)", () => {
    it("parses single named argument", () => {
      const args = parseSkillArgs("test-skill", ["file=main.ts"]);
      expect(args).toEqual({ file: "main.ts" });
    });

    it("parses multiple named arguments", () => {
      const args = parseSkillArgs("test-skill", ["input=in.ts", "output=out.ts", "verbose=true"]);
      expect(args).toEqual({ input: "in.ts", output: "out.ts", verbose: "true" });
    });

    it("handles empty value in named argument", () => {
      const args = parseSkillArgs("test-skill", ["flag="]);
      expect(args).toEqual({ flag: "" });
    });

    it("handles equals sign in value", () => {
      const args = parseSkillArgs("test-skill", ["expr=a=b=c"]);
      expect(args).toEqual({ expr: "a=b=c" });
    });

    it("last occurrence wins for duplicate named arguments", () => {
      const args = parseSkillArgs("test-skill", ["file=a.ts", "file=b.ts"]);
      expect(args).toEqual({ file: "b.ts" });
    });
  });

  describe("positional arguments (with skill manifest)", () => {
    it("maps positional args to manifest argument names in order", () => {
      const registry = createSkillRegistry({
        skills: new Map([
          [
            "test-skill",
            createSkillDefinition(
              createSkillManifest({
                name: "test-skill",
                version: "1.0.0",
                description: "Test",
                arguments: [
                  { name: "input", description: "Input file", required: true },
                  { name: "output", description: "Output file", required: false },
                ],
              }),
              "Do stuff.",
            ),
          ],
        ]),
      });

      const args = parseSkillArgs("test-skill", ["src/in.ts", "src/out.ts"], registry);
      expect(args).toEqual({ input: "src/in.ts", output: "src/out.ts" });
    });

    it("mixes named and positional args correctly", () => {
      const registry = createSkillRegistry({
        skills: new Map([
          [
            "test-skill",
            createSkillDefinition(
              createSkillManifest({
                name: "test-skill",
                version: "1.0.0",
                description: "Test",
                arguments: [
                  { name: "input", description: "Input", required: true },
                  { name: "output", description: "Output", required: false },
                ],
              }),
              "Do stuff.",
            ),
          ],
        ]),
      });

      const args = parseSkillArgs("test-skill", ["output=explicit.ts", "implicit.ts"], registry);
      expect(args).toEqual({ output: "explicit.ts", input: "implicit.ts" });
    });

    it("uses fallback argN for extra positional args beyond manifest", () => {
      const registry = createSkillRegistry({
        skills: new Map([
          [
            "test-skill",
            createSkillDefinition(
              createSkillManifest({
                name: "test-skill",
                version: "1.0.0",
                description: "Test",
                arguments: [{ name: "only", description: "Only one", required: true }],
              }),
              "Do stuff.",
            ),
          ],
        ]),
      });

      const args = parseSkillArgs("test-skill", ["first.ts", "second.ts", "third.ts"], registry);
      expect(args).toEqual({ only: "first.ts", arg1: "second.ts", arg2: "third.ts" });
    });
  });

  describe("fallback positional arguments (argN)", () => {
    it("uses argN when no registry provided", () => {
      const args = parseSkillArgs("any-skill", ["val1", "val2", "val3"]);
      expect(args).toEqual({ arg0: "val1", arg1: "val2", arg2: "val3" });
    });

    it("uses argN when skill not found in registry", () => {
      const registry = createSkillRegistry({ skills: new Map() });
      const args = parseSkillArgs("unknown-skill", ["val1", "val2"], registry);
      expect(args).toEqual({ arg0: "val1", arg1: "val2" });
    });

    it("uses argN when skill has no arguments defined in manifest", () => {
      const registry = createSkillRegistry({
        skills: new Map([
          [
            "no-args-skill",
            createSkillDefinition(
              createSkillManifest({
                name: "no-args-skill",
                version: "1.0.0",
                description: "Test",
              }),
              "Do stuff.",
            ),
          ],
        ]),
      });

      const args = parseSkillArgs("no-args-skill", ["val1", "val2"], registry);
      expect(args).toEqual({ arg0: "val1", arg1: "val2" });
    });
  });

  describe("edge cases", () => {
    it("returns empty object for no arguments", () => {
      const args = parseSkillArgs("test-skill", []);
      expect(args).toEqual({});
    });

    it("handles empty string arguments", () => {
      const args = parseSkillArgs("test-skill", [""]);
      expect(args).toEqual({ arg0: "" });
    });
  });
});
