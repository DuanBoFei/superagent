import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeBrowserError, redactBrowserSecrets } from "./errors";
import type { BrowserArtifact } from "./types";

export interface BrowserArtifactWriter {
  mkdir(path: string): Promise<void>;
  writeFile(path: string, content: Uint8Array): Promise<void>;
}

export interface CreateScreenshotArtifactInput {
  artifactDir: string;
  label?: string;
  content: Uint8Array;
  now?: Date;
  id?: string;
  writer?: BrowserArtifactWriter;
}

export type CreateScreenshotArtifactResult =
  | { ok: true; artifact: BrowserArtifact }
  | { ok: false; safeError: string };

const defaultWriter: BrowserArtifactWriter = {
  mkdir: async (path) => { await mkdir(path, { recursive: true }); },
  writeFile,
};

export async function createScreenshotArtifact(
  input: CreateScreenshotArtifactInput,
): Promise<CreateScreenshotArtifactResult> {
  const writer = input.writer ?? defaultWriter;
  const id = input.id ?? randomUUID();
  const createdAt = input.now ?? new Date();
  const label = input.label !== undefined ? sanitizeArtifactLabel(input.label) : "screenshot";
  const path = join(input.artifactDir, `${createdAt.toISOString().replace(/[:.]/g, "-")}-${label}-${id}.png`);

  try {
    await writer.mkdir(input.artifactDir);
    await writer.writeFile(path, input.content);
  } catch (error) {
    return {
      ok: false,
      safeError: normalizeBrowserError("setup_failed", error instanceof Error ? error.message : String(error)),
    };
  }

  return {
    ok: true,
    artifact: {
      id,
      kind: "screenshot",
      path,
      mimeType: "image/png",
      bytes: input.content.byteLength,
      createdAt,
    },
  };
}

function sanitizeArtifactLabel(label: string): string {
  const redacted = redactBrowserSecrets(label).replace(/\[REDACTED\]/g, "redacted");
  const sanitized = redacted.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized.slice(0, 64) : "screenshot";
}
