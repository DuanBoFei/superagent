import { describe, expect, it } from "vitest";
import { matchPattern } from "../../src/permissions/matcher";

describe("matchPattern", () => {
  it("exact tool and args match", () => {
    expect(matchPattern("Read", { file_path: "src/file.ts" }, "Read:src/file.ts")).toBe(true);
  });

  it("wildcard tool matches any tool", () => {
    expect(matchPattern("Read", { pattern: "*.ts" }, "*:*")).toBe(true);
    expect(matchPattern("Bash", { command: "ls" }, "*:*")).toBe(true);
  });

  it("wildcard args matches partial", () => {
    expect(matchPattern("Bash", { command: "git commit -m fix" }, "Bash:git *")).toBe(true);
  });

  it("non-matching args returns false", () => {
    expect(matchPattern("Bash", { command: "git status" }, "Bash:rm *")).toBe(false);
  });

  it("non-matching tool returns false", () => {
    expect(matchPattern("Grep", { pattern: "foo" }, "Read:*")).toBe(false);
  });

  it("empty pattern returns false", () => {
    expect(matchPattern("Read", { file_path: "x.ts" }, "")).toBe(false);
  });

  it("pattern without colon returns false", () => {
    expect(matchPattern("Read", { file_path: "x.ts" }, "Read")).toBe(false);
  });

  it("regex special chars in args are escaped", () => {
    expect(matchPattern("Read", { file_path: "src/file.test.ts" }, "Read:src/file.test.ts")).toBe(true);
  });

  it("pattern with only wildcard after colon matches any args", () => {
    expect(matchPattern("Glob", { pattern: "**/*.ts" }, "Glob:*")).toBe(true);
  });

  it("multiple arg values joined with space for matching", () => {
    expect(matchPattern("Bash", { cmd: "rm", flag: "-rf", target: "build/" }, "Bash:rm *")).toBe(true);
  });

  it("exact tool match with wildcard args", () => {
    expect(matchPattern("Read", { file_path: "any/path/here.ts" }, "Read:*")).toBe(true);
  });
});
