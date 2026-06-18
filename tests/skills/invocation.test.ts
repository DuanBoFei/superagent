import { describe, expect, it } from "vitest";
import { createSkillManifest, createSkillArgument } from "../../src/skills/types";
import { validateArgs } from "../../src/skills/invocation";

describe("validateArgs", () => {
  it("returns empty diagnostics when all required args provided", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
      arguments: [
        createSkillArgument({ name: "target", description: "Target file", required: true }),
      ],
    });

    const diags = validateArgs(manifest, { target: "src/foo.ts" });
    expect(diags).toEqual([]);
  });

  it("returns empty diagnostics for manifest with no arguments", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
    });

    const diags = validateArgs(manifest, {});
    expect(diags).toEqual([]);
  });

  it("returns missing-arg diagnostic for missing required argument", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
      arguments: [
        createSkillArgument({ name: "feature", description: "Feature ID", required: true }),
      ],
    });

    const diags = validateArgs(manifest, {});
    expect(diags.length).toBe(1);
    expect(diags[0].reason).toBe("missing-arg");
    expect(diags[0].skillName).toBe("test");
    expect(diags[0].message).toContain("feature");
  });

  it("returns multiple diagnostics for multiple missing required args", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
      arguments: [
        createSkillArgument({ name: "a", description: "A", required: true }),
        createSkillArgument({ name: "b", description: "B", required: true }),
      ],
    });

    const diags = validateArgs(manifest, {});
    expect(diags.length).toBe(2);
  });

  it("ignores extra args not declared in manifest", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
      arguments: [
        createSkillArgument({ name: "target", description: "T", required: true }),
      ],
    });

    const diags = validateArgs(manifest, { target: "x", extra: "y" });
    expect(diags).toEqual([]);
  });

  it("optional arg missing is valid", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
      arguments: [
        createSkillArgument({ name: "target", description: "T", required: false }),
      ],
    });

    const diags = validateArgs(manifest, {});
    expect(diags).toEqual([]);
  });
});
