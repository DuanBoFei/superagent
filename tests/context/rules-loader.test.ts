import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadRules } from "../../src/context/rules-loader";

const tmpDir = __dirname;

describe("Rules Loader", () => {
  const tmpFile = join(tmpDir, "_test_rules.md");

  beforeEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  afterEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  it("returns empty string for missing file", () => {
    const result = loadRules("/nonexistent/path/rules.md");
    expect(result).toBe("");
  });

  it("returns content with header for existing file", () => {
    writeFileSync(tmpFile, "# Test Rules\nUse tabs.", "utf-8");
    const result = loadRules(tmpFile);
    expect(result).toBe("## Project Rules\n# Test Rules\nUse tabs.");
  });

  it("handles empty file", () => {
    writeFileSync(tmpFile, "", "utf-8");
    const result = loadRules(tmpFile);
    expect(result).toBe("## Project Rules\n");
  });

  it("truncates files larger than 50KB and warns", () => {
    const large = "x".repeat(60_000);
    writeFileSync(tmpFile, large, "utf-8");

    const warnings: string[] = [];
    const orig = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    };

    try {
      const result = loadRules(tmpFile);
      expect(result).toContain("## Project Rules\n");
      expect(result.length).toBeLessThanOrEqual(
        "## Project Rules\n".length + 50_000,
      );
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings.some((w) => w.includes("truncated"))).toBe(true);
    } finally {
      console.warn = orig;
    }
  });
});
