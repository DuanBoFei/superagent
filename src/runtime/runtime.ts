import { createQueryLoop, QueryLoopDeps } from "./query-loop";
import { SessionState, State, TurnEvent } from "./types";
import { composePrompt } from "./stubs/context";
import { sendMessage } from "./stubs/model";
import { checkPermission } from "./stubs/permission";
import { saveSession } from "./stubs/session";

function defaultDeps(): QueryLoopDeps {
  return {
    maxTurns: 50,
    composePrompt,
    sendMessage,
    checkPermission,
    saveSession,
  };
}

function createFreshSession(overrides?: Partial<SessionState>): SessionState {
  return {
    sessionId: crypto.randomUUID(),
    turnNumber: 0,
    messages: [],
    toolResults: [],
    state: State.IDLE,
    interruptFlag: false,
    startedAt: Date.now(),
    ...overrides,
  };
}

export interface RuntimeHandle {
  getSession(): SessionState;
  startTurn(userMessage: string): AsyncGenerator<TurnEvent>;
  resumeSession(sessionId: string): AsyncGenerator<TurnEvent>;
}

export function createRuntime(deps?: Partial<QueryLoopDeps>): RuntimeHandle {
  const resolvedDeps = { ...defaultDeps(), ...deps };
  let session: SessionState = createFreshSession();

  return {
    getSession() {
      return session;
    },

    async *startTurn(userMessage: string) {
      session.messages.push({ role: "user", content: userMessage });

      const sigintHandler = () => {
        session.interruptFlag = true;
      };
      process.once("SIGINT", sigintHandler);

      try {
        yield* createQueryLoop(session, resolvedDeps);
      } finally {
        process.off("SIGINT", sigintHandler);
      }
    },

    async *resumeSession(sessionId: string) {
      session = createFreshSession({
        sessionId,
        messages: [
          { role: "system", content: "Continue where you left off." },
        ],
      });

      yield* createQueryLoop(session, resolvedDeps);
    },
  };
}
