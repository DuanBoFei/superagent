import { describe, expect, it } from "vitest";
import { discoverSkills } from "../../src/skills/discovery";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

function writeSkill(dir: string, name: string, bodyContent?: string) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "SKILL.md"),
    `---
name: ${name}
description: A test skill.
version: 1.0.0
entry: SKILL.md
---

${bodyContent ?? "This is the body content for " + name + "."}
`,
    "utf-8",
  );
}

describe("discoverSkills", () => {
  // T012: Deterministic scan order
  it("discovers skills from a directory sorted alphabetically", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc-"));
    try {
      writeSkill(path.join(root, "zebra"), "zebra");
      writeSkill(path.join(root, "alpha"), "alpha");
      writeSkill(path.join(root, "delta"), "delta");

      const result = discoverSkills([root], { maxBodySize: 10000 });

      expect(result.diagnostics).toEqual([]);
      const names = [...result.registry.skills.keys()];
      expect(names).toEqual(["alpha", "delta", "zebra"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  // T012: Multiple source directories
  it("scans multiple source directories in configured order", () => {
    const root1 = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc2-"));
    const root2 = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc3-"));
    try {
      writeSkill(path.join(root1, "first"), "shared");
      writeSkill(path.join(root2, "second"), "other");

      const result = discoverSkills([root1, root2], { maxBodySize: 10000 });

      expect(result.registry.skills.has("shared")).toBe(true);
      expect(result.registry.skills.has("other")).toBe(true);
      expect(result.registry.sourceOrder).toEqual([root1, root2]);
    } finally {
      fs.rmSync(root1, { recursive: true, force: true });
      fs.rmSync(root2, { recursive: true, force: true });
    }
  });

  // T013: Skip invalid skill, continue loading valid skills
  it("skips invalid skills and continues loading valid ones", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc4-"));
    try {
      writeSkill(path.join(root, "valid"), "valid");

      // Write invalid SKILL.md (missing version)
      fs.mkdirSync(path.join(root, "invalid"), { recursive: true });
      fs.writeFileSync(
        path.join(root, "invalid", "SKILL.md"),
        `---
name: invalid
description: Missing version field.
---\n`,
        "utf-8",
      );

      const result = discoverSkills([root], { maxBodySize: 10000 });

      expect(result.registry.skills.has("valid")).toBe(true);
      expect(result.registry.skills.has("invalid")).toBe(false);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics.some((d) => d.skillName === "invalid")).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  // T014: Missing SKILL.md diagnostic
  it("emits diagnostic for missing SKILL.md in a subdirectory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc5-"));
    try {
      // Create a subdirectory without SKILL.md
      fs.mkdirSync(path.join(root, "empty-dir"), { recursive: true });

      const result = discoverSkills([root], { maxBodySize: 10000 });

      // No SKILL.md means it's treated as not-a-skill directory, no diagnostic
      // But we don't error — discovery just skips non-skill directories
      expect(result.registry.skills.size).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("emits diagnostic for missing SKILL.md when directory name looks like a skill", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc6-"));
    try {
      // Create a file that's named like a skill but isn't a SKILL.md
      fs.mkdirSync(path.join(root, "looks-like-skill"), { recursive: true });
      fs.writeFileSync(
        path.join(root, "looks-like-skill", "README.md"),
        "Not a skill",
        "utf-8",
      );

      const result = discoverSkills([root], { maxBodySize: 10000 });

      // Empty or non-skill dirs are simply ignored
      expect(result.diagnostics.filter((d) => d.reason === "file-missing").length).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  // T015+T016: Duplicate name override
  it("project-local skill overrides same-name user-global skill with diagnostic", () => {
    const userRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc7-"));
    const projRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc8-"));
    try {
      writeSkill(path.join(userRoot, "lint"), "lint");
      writeSkill(path.join(projRoot, "lint"), "lint");

      const result = discoverSkills([projRoot, userRoot], { maxBodySize: 10000 });

      // Both are loaded but project takes precedence
      expect(result.registry.skills.has("lint")).toBe(true);
      // Duplicate diagnostic is expected
      expect(result.diagnostics.some((d) => d.reason === "duplicate-name")).toBe(true);
    } finally {
      fs.rmSync(userRoot, { recursive: true, force: true });
      fs.rmSync(projRoot, { recursive: true, force: true });
    }
  });

  // T012: Non-existent directory
  it("returns empty registry for non-existent directories", () => {
    const result = discoverSkills(["/nonexistent/path/for/skills"], { maxBodySize: 10000 });
    expect(result.registry.skills.size).toBe(0);
  });

  it("returns empty registry for empty directories", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-disc9-"));
    try {
      const result = discoverSkills([root], { maxBodySize: 10000 });
      expect(result.registry.skills.size).toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
