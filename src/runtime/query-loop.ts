import {
  Message,
  PermissionResult,
  Prompt,
  SessionState,
  State,
  Token,
  TurnEvent,
} from "./types";
import { parseStream } from "./stream-handler";
import { dispatchTools } from "./tool-dispatcher";
import { transition } from "./state-machine";

export interface QueryLoopDeps {
  maxTurns: number;
  composePrompt: (messages: Message[]) => Prompt;
  sendMessage: (prompt: Prompt) => AsyncGenerator<Token>;
  checkPermission: (
    toolName: string,
    args: Record<string, unknown>,
  ) => PermissionResult;
  saveSession: (state: SessionState) => void;
  loadSession?: (id: string) => SessionState | null;
}

export async function* createQueryLoop(
  session: SessionState,
  deps: QueryLoopDeps,
): AsyncGenerator<TurnEvent> {
  let state = session.state;
  let totalTokens = 0;

  while (
    session.turnNumber < deps.maxTurns &&
    !session.interruptFlag
  ) {
    state = transition(state, "user_input");
    session.state = state;

    const prompt = deps.composePrompt(session.messages);

    let hadToolCalls = false;

    try {
      const tokenStream = deps.sendMessage(prompt);
      const events = parseStream(tokenStream);

      for await (const event of events) {
        if (session.interruptFlag) {
          break;
        }

        if (event.type === "text") {
          state = transition(state, "text_complete");
          yield event;
        } else if (event.type === "tool_call") {
          hadToolCalls = true;
          state = transition(state, "tool_calls");
          yield event;

          const permission = deps.checkPermission(event.name, event.args);
          if (!permission.allowed) {
            yield {
              type: "error",
              message: `Permission denied for ${event.name}: ${permission.reason ?? "denied by user"}`,
            };
            hadToolCalls = false;
            break;
          }

          const results = await dispatchTools([
            { name: event.name, args: event.args },
          ]);
          for (const result of results) {
            yield {
              type: "tool_result",
              name: result.name,
              success: result.success,
              summary: result.output.substring(0, 200),
            };
          }

          state = transition(state, "all_done");
        } else if (event.type === "error") {
          state = transition(state, "error");
          yield event;
          hadToolCalls = false;
          break;
        }
      }
    } catch (err) {
      state = transition(state, "error");
      yield {
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error in query loop",
      };
      hadToolCalls = false;
    }

    if (session.interruptFlag) {
      state = transition(state, "interrupt");
    }

    session.turnNumber++;
    session.state = state;

    if (!hadToolCalls) {
      break;
    }
  }

  const reason = session.interruptFlag
    ? "interrupted"
    : session.turnNumber >= deps.maxTurns
      ? "max_turns"
      : "completed";

  yield {
    type: "turn_end",
    summary: {
      turnNumber: session.turnNumber,
      totalTokens,
      totalCost: 0,
      reason,
    },
  };

  deps.saveSession(session);
}
