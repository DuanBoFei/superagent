import type { SessionState } from "../runtime/types";

export class SessionCorruptedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionCorruptedError";
  }
}

export function serialize(state: SessionState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): SessionState {
  if (!json) {
    throw new SessionCorruptedError("empty JSON string");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new SessionCorruptedError(
      `invalid JSON: ${e instanceof Error ? e.message : "unknown error"}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new SessionCorruptedError("deserialized data is not an object");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.sessionId !== "string") {
    throw new SessionCorruptedError("missing or invalid sessionId");
  }
  if (typeof obj.turnNumber !== "number") {
    throw new SessionCorruptedError("missing or invalid turnNumber");
  }
  if (typeof obj.state !== "string") {
    throw new SessionCorruptedError("missing or invalid state");
  }
  if (typeof obj.startedAt !== "number") {
    throw new SessionCorruptedError("missing or invalid startedAt");
  }

  return parsed as SessionState;
}
