import { describe, expect, it } from "vitest";
import { loadConfigFile } from "../../src/config/loader";
import { ConfigError } from "../../src/config/types";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmpDir = join(tmpdir(), `superagent-test-${Date.now()}`);

function createFile(filename: string, content: string): string {
  mkdirSync(tmpDir, { recursive: true });
  const filePath = join(tmpDir, filename);
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

describe("loadConfigFile", () => {
  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns parsed object for valid JSON", () => {
    const path = createFile("good.json", JSON.stringify({ model: "test" }));
    expect(loadConfigFile(path)).toEqual({ model: "test" });
  });

  it("returns null for missing file", () => {
    expect(loadConfigFile(join(tmpDir, "nonexistent.json"))).toBeNull();
  });

  it("returns {} for empty file", () => {
    const path = createFile("empty.json", "");
    expect(loadConfigFile(path)).toEqual({});
  });

  it("throws ConfigError on JSON syntax error", () => {
    const path = createFile("broken.json", "{bad json");
    expect(() => loadConfigFile(path)).toThrow(ConfigError);
    try {
      loadConfigFile(path);
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as ConfigError).code).toBe("PARSE_ERROR");
      expect((e as ConfigError).filePath).toBe(path);
    }
  });
});
