import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { ConfigError } from "./types";

export function loadConfigFile(filePath: string): object | null {
  const resolved = filePath.startsWith("~")
    ? filePath.replace("~", homedir())
    : filePath;

  let raw: string;
  try {
    raw = readFileSync(resolved, "utf-8");
  } catch {
    return null;
  }

  if (raw.length === 0) return {};

  if (raw.charCodeAt(0) === 0xfeff) {
    throw new ConfigError("ENCODING_ERROR", `Config file encoding must be UTF-8: ${resolved}`, {
      filePath: resolved,
    });
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    const lineNumber = extractLineNumber(e);
    throw new ConfigError(
      "PARSE_ERROR",
      `Config error in ${resolved}: ${(e as Error).message}`,
      { filePath: resolved, lineNumber },
    );
  }
}

function extractLineNumber(error: unknown): number | undefined {
  if (error instanceof SyntaxError) {
    const match = /at line (\d+)/.exec(error.message);
    if (match) return Number(match[1]);
  }
  return undefined;
}
