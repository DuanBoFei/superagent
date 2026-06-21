import type { ClientMessageEvent } from "../../packages/web/src/types/message";
import type { RuntimeEvent } from "./socket-handlers";
import type { TurnEvent } from "../runtime/types";
import type { SessionState } from "../runtime/types";

export interface RuntimeBridgeHandle {
  startTurn(userMessage: string): AsyncIterable<TurnEvent>;
  loadHistory(sessionId: string): void;
}

export interface HandleEntry {
  handle: RuntimeBridgeHandle;
  isStreaming: boolean;
  sessionId: string;
}

export type RuntimeHandleFactory = () => RuntimeBridgeHandle;

export class RuntimeBridge {
  private readonly handles = new Map<string, HandleEntry>();

  constructor(
    private readonly createHandle: RuntimeHandleFactory,
  ) {}

  async *routeToRuntime(message: ClientMessageEvent): AsyncGenerator<RuntimeEvent> {
    let entry = this.handles.get(message.sessionId);
    if (!entry) {
      const handle = this.createHandle();
      handle.loadHistory(message.sessionId);
      entry = { handle, isStreaming: false, sessionId: message.sessionId };
      this.handles.set(message.sessionId, entry);
    }

    entry.isStreaming = true;
    try {
      for await (const event of entry.handle.startTurn(message.content)) {
        if (event.type === "text") {
          yield { type: "token", token: event.content };
        } else if (event.type === "tool_call") {
          yield {
            type: "token",
            token: JSON.stringify({ type: "tool_call", name: event.name, input: event.args }),
          };
        } else if (event.type === "tool_result") {
          yield {
            type: "token",
            token: JSON.stringify({ type: "tool_result", name: event.name, success: event.success, summary: event.summary }),
          };
        } else if (event.type === "turn_end") {
          yield {
            type: "complete",
            stats: {
              inputTokens: event.summary.totalTokens,
              outputTokens: 0,
              durationMs: 0,
            },
          };
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    } finally {
      entry.isStreaming = false;
    }
  }

  closeSession(sessionId: string): void {
    this.handles.delete(sessionId);
  }

  getHandleCount(): number {
    return this.handles.size;
  }

  isStreaming(sessionId: string): boolean {
    return this.handles.get(sessionId)?.isStreaming ?? false;
  }
}
