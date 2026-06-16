import { existsSync, rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createScreenshotArtifact } from "../../src/browser/artifacts";

const tempDirs: string[] = [];

async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), "superagent-browser-artifacts-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("createScreenshotArtifact", () => {
  it("creates local screenshot artifact metadata", async () => {
    const artifactDir = await tempDir();
    const now = new Date("2026-06-16T12:00:00.000Z");

    const result = await createScreenshotArtifact({
      artifactDir,
      label: "home page",
      content: new Uint8Array([1, 2, 3]),
      now,
      id: "artifact-1",
    });

    expect(result).toEqual({
      ok: true,
      artifact: {
        id: "artifact-1",
        kind: "screenshot",
        path: join(artifactDir, "2026-06-16T12-00-00-000Z-home-page-artifact-1.png"),
        mimeType: "image/png",
        bytes: 3,
        createdAt: now,
      },
    });
  });

  it("creates artifact path under configured directory", async () => {
    const artifactDir = await tempDir();
    const result = await createScreenshotArtifact({
      artifactDir,
      content: new Uint8Array([1]),
      now: new Date("2026-06-16T12:00:00.000Z"),
      id: "artifact-2",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.artifact.path.startsWith(artifactDir)).toBe(true);
      expect(existsSync(result.artifact.path)).toBe(true);
    }
  });

  it("returns safe result for artifact write failure", async () => {
    const result = await createScreenshotArtifact({
      artifactDir: "/repo/.superagent/browser-artifacts",
      content: new Uint8Array([1]),
      writer: {
        mkdir: async () => {},
        writeFile: async () => { throw new Error("disk full token=sk-secret-token"); },
      },
    });

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.safeError).toContain("Browser setup failed: disk full token=[REDACTED]");
      expect(result.safeError).not.toContain("sk-secret-token");
    }
  });

  it("redacts artifact labels", async () => {
    const artifactDir = await tempDir();
    const result = await createScreenshotArtifact({
      artifactDir,
      label: "token sk-secret-token",
      content: new Uint8Array([1]),
      now: new Date("2026-06-16T12:00:00.000Z"),
      id: "artifact-3",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.artifact.path).not.toContain("sk-secret-token");
      expect(result.artifact.path).toContain("token-redacted");
    }
  });

  it("records artifact size and mime metadata", async () => {
    const artifactDir = await tempDir();
    const result = await createScreenshotArtifact({
      artifactDir,
      content: new Uint8Array([1, 2, 3, 4]),
      now: new Date("2026-06-16T12:00:00.000Z"),
      id: "artifact-4",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.artifact.bytes).toBe(4);
      expect(result.artifact.mimeType).toBe("image/png");
    }
  });
});
