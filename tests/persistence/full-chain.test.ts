import { describe, expect, it } from "vitest";
import { createRuntime } from "../../src/runtime/runtime";
import type { TurnEvent, Token, SessionState, Message } from "../../src/runtime/types";
import { createMemoryStore } from "../../src/persistence/memory-store";

async function collect(stream: AsyncGenerator<TurnEvent>): Promise<TurnEvent[]> {
  const events: TurnEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

async function* textThenDone(): AsyncGenerator<Token> {
  yield { type: "text", content: "analyzing the codebase..." };
}

describe("Full chain: save → interrupt → resume → continue (AC-SP-02)", () => {
  it("session state preserved across interrupt and resume", () => {
    const store = createMemoryStore();
    let savedState: SessionState | null = null;

    // Step 1: Simulate a turn that completes (like normal work)
    const rt1 = createRuntime({
      sendMessage: textThenDone,
      saveSession: (state) => {
        savedState = { ...state, messages: [...state.messages] };
        store.save(state);
      },
    });

    return collect(rt1.startTurn("fix the login bug in auth.ts"))
      .then(() => {
        expect(savedState).not.toBeNull();
        const sid = savedState!.sessionId;

        // Verify turn completed and state was saved
        expect(savedState!.turnNumber).toBe(1);
        expect(
          savedState!.messages.some(
            (m) => m.role === "user" && m.content.includes("fix the login bug"),
          ),
        ).toBe(true);

        // Step 2: Simulate interrupt (Ctrl+C) by setting interruptFlag
        const rtInterrupted = createRuntime({
          sendMessage: async function* () {
            // Signal interrupt mid-response
            rtInterrupted.getSession().interruptFlag = true;
            yield { type: "text", content: "partial resp" };
          },
          saveSession: (state) => {
            savedState = { ...state, messages: [...state.messages] };
            store.save(state);
          },
        });

        return collect(rtInterrupted.startTurn("check the database too")).then(
          (events) => {
            // Verify interrupted turn ended with "interrupted" reason
            const turnEnd = events.find((e) => e.type === "turn_end");
            expect(turnEnd).toBeDefined();
            if (turnEnd!.type === "turn_end") {
              expect(turnEnd.summary.reason).toBe("interrupted");
            }

            // Verify state was saved after interrupt
            expect(savedState!.interruptFlag).toBe(true);
            const interruptedSid = savedState!.sessionId;

            // Step 3: Resume the interrupted session
            const rt3 = createRuntime({
              sendMessage: textThenDone,
              saveSession: () => {},
              loadSession: (id) => store.load(id),
            });

            return collect(rt3.resumeSession(interruptedSid)).then(
              (resumeEvents) => {
                const resumed = rt3.getSession();

                // Original messages preserved
                expect(
                  resumed.messages.some(
                    (m) =>
                      m.role === "user" &&
                      m.content.includes("check the database"),
                  ),
                ).toBe(true);

                // "Continue where you left off" marker present
                expect(
                  resumed.messages.some(
                    (m) =>
                      m.role === "system" &&
                      m.content.includes("Continue where you left off"),
                  ),
                ).toBe(true);

                // Resume turn completed successfully
                const resumeTurnEnd = resumeEvents.find(
                  (e) => e.type === "turn_end",
                );
                expect(resumeTurnEnd).toBeDefined();
                if (resumeTurnEnd!.type === "turn_end") {
                  expect(resumeTurnEnd.summary.reason).toBe("completed");
                }
              },
            );
          },
        );
      });
  });

  it("resume after normal completion preserves previous context", () => {
    const store = createMemoryStore();

    // Complete one turn normally
    const rt1 = createRuntime({
      sendMessage: textThenDone,
      saveSession: (state) => store.save(state),
    });

    return collect(rt1.startTurn("add unit tests for login"))
      .then(() => {
        const list = store.list();
        expect(list).toHaveLength(1);
        const sid = list[0]!.id;

        // Resume and continue work
        const rt2 = createRuntime({
          sendMessage: textThenDone,
          saveSession: () => {},
          loadSession: (id) => store.load(id),
        });

        return collect(rt2.resumeSession(sid)).then(() => {
          const session = rt2.getSession();
          // Original user message preserved
          expect(
            session.messages.some(
              (m) =>
                m.role === "user" && m.content.includes("add unit tests"),
            ),
          ).toBe(true);
          // Session ID preserved
          expect(session.sessionId).toBe(sid);
        });
      });
  });
});
