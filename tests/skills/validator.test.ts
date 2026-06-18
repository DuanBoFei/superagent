import { describe, expect, it } from "vitest";
import { createSkillManifest, createSkillArgument } from "../../src/skills/types";
import {
  validateSkill,
  DEFAULT_MAX_BODY_SIZE,
} from "../../src/skills/validator";

describe("validateSkill", () => {
  const validManifest = createSkillManifest({
    name: "run-feature",
    description: "Run a feature workflow",
    version: "1.0.0",
    entry: "SKILL.md",
  });
  const validBody = "Do the thing.";

  it("returns empty diagnostics for valid manifest and body", () => {
    const diags = validateSkill(validManifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags).toEqual([]);
  });

  // T006: Required fields
  it("rejects missing name", () => {
    const manifest = createSkillManifest({
      name: "",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags.some((d) => d.reason === "missing-name")).toBe(true);
  });

  it("rejects missing description", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "",
      version: "1.0.0",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags.some((d) => d.reason === "missing-description")).toBe(true);
  });

  it("rejects missing version", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags.some((d) => d.reason === "missing-version")).toBe(true);
  });

  // T007: Name format
  it("rejects names with uppercase characters", () => {
    const manifest = createSkillManifest({
      name: "InvalidName",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags.some((d) => d.reason === "invalid-name")).toBe(true);
  });

  it("rejects names with spaces", () => {
    const manifest = createSkillManifest({
      name: "my skill",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags.some((d) => d.reason === "invalid-name")).toBe(true);
  });

  it("rejects names with special characters", () => {
    const manifest = createSkillManifest({
      name: "my@skill!",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags.some((d) => d.reason === "invalid-name")).toBe(true);
  });

  it("accepts kebab-case names", () => {
    const diags = validateSkill(validManifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags).toEqual([]);
  });

  it("accepts names with digits", () => {
    const manifest = createSkillManifest({
      name: "test2-feature",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags).toEqual([]);
  });

  // T008: Semantic version
  it("rejects invalid semantic version format", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "not-a-version",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags.some((d) => d.reason === "invalid-version")).toBe(true);
  });

  it("accepts 0.x.x versions", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "0.1.0",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags).toEqual([]);
  });

  it("accepts multi-digit versions", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "10.20.30",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags).toEqual([]);
  });

  // T009: Argument descriptors
  it("validates each argument has a name", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
      arguments: [
        createSkillArgument({ name: "", description: "No name", required: false }),
      ],
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags.some((d) => d.reason === "missing-name")).toBe(true);
  });

  it("accepts valid arguments", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
      arguments: [
        createSkillArgument({ name: "target", description: "Target file", required: true }),
      ],
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags).toEqual([]);
  });

  // T010: Suggested mode and allowed roles
  it("accepts valid suggestedMode", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
      suggestedMode: "plan",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags).toEqual([]);
  });

  it("accepts valid allowedRoles", () => {
    const manifest = createSkillManifest({
      name: "test",
      description: "desc",
      version: "1.0.0",
      entry: "SKILL.md",
      allowedRoles: ["implement", "review"],
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags).toEqual([]);
  });

  // T011: Body size limit
  it("rejects body exceeding max size", () => {
    const diags = validateSkill(validManifest, "a".repeat(100), { maxBodySize: 50 });
    expect(diags.some((d) => d.reason === "body-too-large")).toBe(true);
  });

  it("accepts body exactly at max size", () => {
    const diags = validateSkill(validManifest, "a".repeat(50), { maxBodySize: 50 });
    expect(diags.every((d) => d.reason !== "body-too-large")).toBe(true);
  });

  it("accepts body under max size", () => {
    const diags = validateSkill(validManifest, "a".repeat(49), { maxBodySize: 50 });
    expect(diags.every((d) => d.reason !== "body-too-large")).toBe(true);
  });

  it("collects multiple diagnostics for multiple violations", () => {
    const manifest = createSkillManifest({
      name: "",
      description: "",
      version: "bad",
      entry: "SKILL.md",
    });
    const diags = validateSkill(manifest, validBody, { maxBodySize: DEFAULT_MAX_BODY_SIZE });
    expect(diags.length).toBeGreaterThanOrEqual(3);
  });
});
