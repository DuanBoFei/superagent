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
import { dispatchTools as defaultDispatchTools } from "./tool-dispatcher";
import { transition } from "./state-machine";
import type { LogEvent } from "../observability/types";

export interface QueryLoopDeps {
  maxTurns: number;
  model: string;
  composePrompt: (messages: Message[]) => Prompt;
  sendMessage: (prompt: Prompt) => AsyncGenerator<Token>;
  checkPermission: (
    toolName: string,
    args: Record<string, unknown>,
  ) => PermissionResult;
  saveSession: (state: SessionState) => void;
  loadSession?: (id: string) => SessionState | null;
  dispatchTools?: (calls: Array<{ name: string; args: Record<string, unknown> }>) => Promise<Array<{ name: string; success: boolean; output: string; error?: string }>>;
  emit?: (event: LogEvent) => void;
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

    const turnNumber = session.turnNumber + 1;
    deps.emit?.({ type: "turn:start", turnNumber });

    const prompt = deps.composePrompt(session.messages);
    const estimatedTokens = Math.ceil(
      (JSON.stringify(prompt).length + JSON.stringify(session.messages).length) / 4,
    );

    deps.emit?.({
      type: "model:request",
      model: deps.model,
      estimatedInputTokens: estimatedTokens,
    });

    let hadToolCalls = false;
    let firstTokenEmitted = false;
    const turnStart = Date.now();

    try {
      const tokenStream = deps.sendMessage(prompt);
      const events = parseStream(tokenStream);

      for await (const event of events) {
        if (session.interruptFlag) {
          break;
        }

        if (!firstTokenEmitted) {
          firstTokenEmitted = true;
          deps.emit?.({
            type: "model:first_token",
            latencyMs: Date.now() - turnStart,
          });
        }

        if (event.type === "text") {
          state = transition(state, "text_complete");
          totalTokens += event.content.length;
          yield event;
        } else if (event.type === "tool_call") {
          hadToolCalls = true;
          state = transition(state, "tool_calls");
          yield event;

          const permission = deps.checkPermission(event.name, event.args);
          if (!permission.allowed) {
            deps.emit?.({
              type: "error",
              message: `Permission denied for ${event.name}: ${permission.reason ?? "denied by user"}`,
            });
            yield {
              type: "error",
              message: `Permission denied for ${event.name}: ${permission.reason ?? "denied by user"}`,
            };
            hadToolCalls = false;
            break;
          }

          deps.emit?.({
            type: "tool:start",
            toolName: event.name,
            argsSummary: JSON.stringify(event.args).substring(0, 200),
          });

          const toolStart = Date.now();
          const results = await (deps.dispatchTools ?? defaultDispatchTools)([
            { name: event.name, args: event.args },
          ]);
          for (const result of results) {
            deps.emit?.({
              type: "tool:end",
              toolName: result.name,
              durationMs: Date.now() - toolStart,
              success: result.success,
            });
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
          deps.emit?.({ type: "error", message: event.message });
          yield event;
          hadToolCalls = false;
          break;
        }
      }

      deps.emit?.({
        type: "model:response",
        model: deps.model,
        inputTokens: estimatedTokens,
        outputTokens: Math.ceil(totalTokens / 4),
        cost: 0,
      });
    } catch (err) {
      state = transition(state, "error");
      const msg = err instanceof Error ? err.message : "Unknown error in query loop";
      deps.emit?.({ type: "error", message: msg });
      yield {
        type: "error",
        message: msg,
      };
      hadToolCalls = false;
    }

    if (session.interruptFlag) {
      state = transition(state, "interrupt");
    }

    session.turnNumber++;
    session.state = state;

    deps.emit?.({
      type: "turn:end",
      turnNumber: session.turnNumber,
      inputTokens: estimatedTokens,
      outputTokens: Math.ceil(totalTokens / 4),
    });

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
