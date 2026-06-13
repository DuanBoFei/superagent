import { describe, expect, it } from "vitest";
import { createRuntime } from "../../src/runtime/runtime";
import type { TurnEvent, Token, SessionState } from "../../src/runtime/types";
import { createMemoryStore } from "../../src/persistence/memory-store";
import type { SessionManager } from "../../src/persistence";

async function collect(stream: AsyncGenerator<TurnEvent>): Promise<TurnEvent[]> {
  const events: TurnEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

async function* textModel(): AsyncGenerator<Token> {
  yield { type: "text", content: "provider response" };
}

describe("Runtime <-> Persistence round-trip", () => {
  it("saveSession receives state after turn completes", () => {
    let saved: SessionState | null = null;
    const runtime = createRuntime({
      sendMessage: textModel,
      saveSession: (state) => {
        saved = state;
      },
    });

    return collect(runtime.startTurn("hello")).then(() => {
      expect(saved).not.toBeNull();
      expect(saved!.sessionId).toBe(runtime.getSession().sessionId);
      expect(saved!.turnNumber).toBe(1);
      expect(saved!.messages.length).toBeGreaterThan(0);
    });
  });

  it("state survives save → load → resume cycle", () => {
    const store = createMemoryStore();

    // Step 1: Run a turn and save
    const rt1 = createRuntime({
      sendMessage: textModel,
      saveSession: (state) => store.save(state),
    });

    return collect(rt1.startTurn("fix the auth bug"))
      .then(() => {
        const list = store.list();
        expect(list).toHaveLength(1);
        const sessionId = list[0]!.id;

        // Step 2: Load back and verify key fields
        const loaded = store.load(sessionId);
        expect(loaded).not.toBeNull();
        expect(loaded!.messages.some((m) => m.content === "fix the auth bug")).toBe(
          true,
        );
        expect(loaded!.turnNumber).toBe(1);

        // Step 3: Resume with loaded state
        const rt2 = createRuntime({
          sendMessage: textModel,
          saveSession: () => {},
          loadSession: (id) => store.load(id),
        });

        return collect(rt2.resumeSession(sessionId)).then(() => {
          expect(rt2.getSession().sessionId).toBe(sessionId);
          expect(rt2.getSession().messages.some((m) => m.role === "system")).toBe(
            true,
          );
          // turnNumber incremented again during the resume turn
          expect(rt2.getSession().turnNumber).toBe(2);
        });
      });
  });

  it("loadSession returning null triggers fresh session fallback", () => {
    const runtime = createRuntime({
      sendMessage: textModel,
      saveSession: () => {},
      loadSession: () => null,
    });

    return collect(runtime.resumeSession("non-existent-id")).then(() => {
      expect(runtime.getSession().sessionId).toBe("non-existent-id");
      expect(runtime.getSession().messages).toHaveLength(1);
      expect(runtime.getSession().messages[0]!.role).toBe("system");
      // fresh session starts at 0, incremented to 1 by the loop
      expect(runtime.getSession().turnNumber).toBe(1);
    });
  });
});
