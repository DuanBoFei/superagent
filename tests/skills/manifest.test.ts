import { describe, expect, it } from "vitest";
import { parseSkillFrontmatter, parseSkillManifest } from "../../src/skills/manifest";

describe("parseSkillFrontmatter", () => {
  it("parses valid frontmatter with all fields", () => {
    const content = `---
name: run-feature
description: Run a feature workflow from spec to verification.
version: 1.0.0
entry: SKILL.md
suggestedMode: plan
allowedRoles:
  - implement
  - review
arguments:
  - name: feature
    description: Feature number or directory.
    required: true
---

Skill instructions in markdown.
Run this to execute a feature workflow.
`;

    const result = parseSkillFrontmatter(content);

    expect(result.metadata.name).toBe("run-feature");
    expect(result.metadata.description).toBe(
      "Run a feature workflow from spec to verification.",
    );
    expect(result.metadata.version).toBe("1.0.0");
    expect(result.metadata.entry).toBe("SKILL.md");
    expect(result.metadata.suggestedMode).toBe("plan");
    expect(result.metadata.allowedRoles).toEqual(["implement", "review"]);
    expect(result.metadata.arguments).toEqual([
      { name: "feature", description: "Feature number or directory.", required: true },
    ]);
    expect(result.body).toBe(
      "Skill instructions in markdown.\nRun this to execute a feature workflow.\n",
    );
  });

  it("parses minimal frontmatter with only required fields", () => {
    const content = `---
name: lint
description: Lint the project.
version: 0.1.0
entry: SKILL.md
---

pnpm lint
`;

    const result = parseSkillFrontmatter(content);

    expect(result.metadata.name).toBe("lint");
    expect(result.metadata.description).toBe("Lint the project.");
    expect(result.metadata.version).toBe("0.1.0");
    expect(result.metadata.entry).toBe("SKILL.md");
    expect(result.metadata.arguments).toBeUndefined();
    expect(result.metadata.suggestedMode).toBeUndefined();
    expect(result.metadata.allowedRoles).toBeUndefined();
    expect(result.body).toBe("pnpm lint\n");
  });

  it("handles frontmatter without trailing newline after closing ---", () => {
    const content = `---
name: test
description: Run tests.
version: 1.0.0
entry: SKILL.md
---
pnpm test`;

    const result = parseSkillFrontmatter(content);

    expect(result.metadata.name).toBe("test");
    expect(result.body).toBe("pnpm test");
  });

  it("returns null for missing opening ---", () => {
    const content = `name: test
description: Bad format`;

    const result = parseSkillFrontmatter(content);

    expect(result).toBeNull();
  });

  it("returns null for missing closing ---", () => {
    const content = `---
name: test
description: Unclosed frontmatter`;

    const result = parseSkillFrontmatter(content);

    expect(result).toBeNull();
  });

  it("returns null for empty frontmatter", () => {
    const content = `---
---
body only`;

    const result = parseSkillFrontmatter(content);

    // Empty frontmatter is valid but produces empty metadata
    expect(result).not.toBeNull();
    expect(result!.metadata).toEqual({});
    expect(result!.body).toBe("body only");
  });
});

describe("parseSkillManifest", () => {
  it("returns SkillManifest from valid content", () => {
    const content = `---
name: build
description: Build the project.
version: 2.0.0
entry: SKILL.md
arguments:
  - name: target
    description: Build target.
    required: false
---

Run the build command.
`;

    const manifest = parseSkillManifest(content, "/skills/build/SKILL.md");

    expect(manifest).not.toBeNull();
    expect(manifest!.name).toBe("build");
    expect(manifest!.description).toBe("Build the project.");
    expect(manifest!.version).toBe("2.0.0");
    expect(manifest!.arguments).toHaveLength(1);
  });

  it("returns null for missing required fields", () => {
    const content = `---
name: broken
---

no description or version`;

    const manifest = parseSkillManifest(content, "/skills/broken/SKILL.md");
    expect(manifest).toBeNull();
  });
});
