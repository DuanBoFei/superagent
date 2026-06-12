import { describe, expect, it } from "vitest";
import { getConfig } from "../../src/config/config";
import { ConfigError } from "../../src/config/types";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmpDir = join(tmpdir(), `superagent-config-test-${Date.now()}`);

function createFile(relativePath: string, content: string): string {
  const fullDir = join(tmpDir, relativePath.split("/").slice(0, -1).join("/"));
  mkdirSync(fullDir, { recursive: true });
  const filePath = join(tmpDir, relativePath);
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

describe("getConfig", () => {
  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads defaults when no files or env vars", () => {
    // Without apiKey, should throw
    expect(() =>
      getConfig({
        globalConfigDir: join(tmpDir, "nonexistent"),
        projectConfigDir: join(tmpDir, "nonexistent"),
        env: {},
      }),
    ).toThrow(ConfigError);
  });

  it("project overrides global", () => {
    const globalDir = join(tmpDir, "home");
    const projectDir = join(tmpDir, "project");
    mkdirSync(globalDir, { recursive: true });
    mkdirSync(projectDir, { recursive: true });

    writeFileSync(
      join(globalDir, "settings.json"),
      JSON.stringify({ apiKey: "sk-test", maxTurns: 30 }),
    );
    writeFileSync(
      join(projectDir, "settings.json"),
      JSON.stringify({ maxTurns: 50 }),
    );

    const { config } = getConfig({
      globalConfigDir: globalDir,
      projectConfigDir: projectDir,
      env: {},
    });

    expect(config.maxTurns).toBe(50);
    expect(config.apiKey).toBe("sk-test");
  });

  it("env var overrides project", () => {
    const projectDir = join(tmpDir, "project2");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      join(projectDir, "settings.json"),
      JSON.stringify({ apiKey: "sk-test", model: "flash" }),
    );

    const { config } = getConfig({
      globalConfigDir: join(tmpDir, "nonexistent-g"),
      projectConfigDir: projectDir,
      env: { SUPERAGENT_MODEL: "deepseek-v4-pro" },
    });

    expect(config.model).toBe("deepseek-v4-pro");
  });

  it("syntax error in config file — boots with defaults + warning", () => {
    const projectDir = join(tmpDir, "project-broken");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "settings.json"), "{bad json");

    // Without apiKey from anywhere, should throw
    expect(() =>
      getConfig({
        globalConfigDir: join(tmpDir, "nonexistent"),
        projectConfigDir: projectDir,
        env: {},
      }),
    ).toThrow(ConfigError);
  });

  it("syntax error in file — continues with defaults when apiKey from env", () => {
    const projectDir = join(tmpDir, "project-broken2");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "settings.json"), "{bad json");

    const { config, warnings } = getConfig({
      globalConfigDir: join(tmpDir, "nonexistent"),
      projectConfigDir: projectDir,
      env: { SUPERAGENT_API_KEY: "sk-from-env" },
    });

    expect(config.apiKey).toBe("sk-from-env");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.includes("Config error"))).toBe(true);
  });
});
