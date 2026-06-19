import type { ClientMessageEvent } from "../../packages/web/src/types/message";
import type { RuntimeEvent } from "./socket-handlers";
import type { TurnEvent } from "../runtime/types";

export interface RuntimeBridgeHandle {
  startTurn(userMessage: string): AsyncIterable<TurnEvent>;
}

export class RuntimeBridge {
  private readonly aborted = new Set<string>();

  constructor(private readonly runtime: RuntimeBridgeHandle) {}

  async *routeToRuntime(message: ClientMessageEvent): AsyncGenerator<RuntimeEvent> {
    for await (const event of this.runtime.startTurn(message.content)) {
      if (this.aborted.has(message.messageId)) {
        yield { type: "complete" };
        return;
      }

      if (event.type === "text") {
        yield { type: "token", token: event.content };
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
  }

  abortTurn(messageId: string): void {
    this.aborted.add(messageId);
  }

  isAborted(messageId: string): boolean {
    return this.aborted.has(messageId);
  }
}
