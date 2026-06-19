import type { ClientMessageEvent, MessageErrorEvent, TokenUsageStats } from "../../packages/web/src/types/message";

export interface SocketEmitter {
  emit(event: string, payload: unknown): void;
}

export type RuntimeEvent =
  | { type: "token"; token: string }
  | { type: "complete"; stats?: TokenUsageStats };

export interface MessageRuntime {
  startTurn(message: ClientMessageEvent): AsyncIterable<RuntimeEvent>;
}

export function registerClientMessageHandler(runtime: MessageRuntime) {
  return async (socket: SocketEmitter, message: ClientMessageEvent): Promise<void> => {
    try {
      for await (const event of runtime.startTurn(message)) {
        if (event.type === "token") {
          socket.emit("stream_token", {
            messageId: message.messageId,
            sessionId: message.sessionId,
            token: event.token,
          });
        } else {
          socket.emit("message_complete", {
            messageId: message.messageId,
            sessionId: message.sessionId,
            stats: event.stats,
          });
        }
      }
    } catch (error) {
      const payload: MessageErrorEvent = {
        messageId: message.messageId,
        sessionId: message.sessionId,
        code: "RUNTIME_ERROR",
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      };
      socket.emit("message_error", payload);
    }
  };
}
