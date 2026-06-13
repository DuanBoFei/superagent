import { describe, expect, it } from "vitest";
import { BLACKLIST } from "../../src/permissions/blacklist";

describe("Blacklist", () => {
  it("all patterns are non-empty", () => {
    for (const pattern of BLACKLIST) {
      expect(pattern.length).toBeGreaterThan(0);
    }
  });

  it("all patterns contain colon separator", () => {
    for (const pattern of BLACKLIST) {
      expect(pattern).toMatch(/^.+:.+$/);
    }
  });

  it("no duplicate patterns", () => {
    const seen = new Set<string>();
    for (const pattern of BLACKLIST) {
      expect(seen.has(pattern)).toBe(false);
      seen.add(pattern);
    }
  });

  it("has at least 5 entries", () => {
    expect(BLACKLIST.length).toBeGreaterThanOrEqual(5);
  });

  it("covers rm -rf / pattern", () => {
    expect(BLACKLIST).toContain("Bash:rm -rf /*");
  });

  it("covers curl pipe bash pattern", () => {
    expect(BLACKLIST).toContain("Bash:curl * | bash");
  });

  it("covers eval pattern", () => {
    expect(BLACKLIST).toContain("Bash:eval *");
  });

  it("covers sudo pattern", () => {
    expect(BLACKLIST).toContain("Bash:sudo *");
  });

  it("covers force push pattern", () => {
    expect(BLACKLIST).toContain("Bash:git push --force *");
  });
});
