import type { ClientMessageEvent, MessageErrorEvent, TokenUsageStats } from "../../packages/web/src/types/message";
import type {
  SessionSummary as SocketSessionSummary,
  SessionListEvent,
  SessionLoadedEvent,
} from "./socket-types";

export interface SocketEmitter {
  emit(event: string, payload: unknown): void;
  on?(event: string, handler: (data: unknown) => void): void;
}

export type RuntimeEvent =
  | { type: "token"; token: string }
  | { type: "complete"; stats?: TokenUsageStats };

export interface MessageRuntime {
  startTurn(message: ClientMessageEvent): AsyncIterable<RuntimeEvent>;
}

export interface SessionListEntry {
  id: string;
  createdAt: number;
  updatedAt: number;
  turnCount: number;
  firstMessage: string;
}

export interface SessionDataProvider {
  listSessions(limit?: number): SessionListEntry[];
  loadSessionMessages(
    id: string,
  ): Array<{ role: "user" | "assistant" | "system"; content: string }> | null;
  renameSession(id: string, title: string): void;
  deleteSession(id: string): void;
}

function toSocketSessionSummary(entry: SessionListEntry): SocketSessionSummary {
  const preview =
    entry.firstMessage.length > 100
      ? entry.firstMessage.slice(0, 100)
      : entry.firstMessage;
  return {
    id: entry.id,
    title: entry.firstMessage.slice(0, 50) || "Untitled",
    firstMessagePreview: preview,
    createdAt: new Date(entry.createdAt).toISOString(),
    updatedAt: new Date(entry.updatedAt).toISOString(),
    messageCount: entry.turnCount,
  };
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

export function registerSessionHandlers(
  socket: SocketEmitter,
  provider: SessionDataProvider,
): void {
  if (!socket.on) return;

  socket.on("get_sessions", () => {
    try {
      const sessions = provider.listSessions(50).map(toSocketSessionSummary);
      const payload: SessionListEvent = { sessions };
      socket.emit("session_list", payload);
    } catch {
      socket.emit("session_list", { sessions: [] });
    }
  });

  socket.on("load_session", (data: { sessionId: string }) => {
    try {
      const messages = provider.loadSessionMessages(data.sessionId);
      if (!messages) {
        return;
      }
      const payload: SessionLoadedEvent = {
        sessionId: data.sessionId,
        messages: messages.map((m, i) => ({
          id: `${data.sessionId}-${i}`,
          role: m.role,
          content: m.content,
          timestamp: Date.now() - (messages.length - i) * 1000,
        })),
      };
      socket.emit("session_loaded", payload);
    } catch {
      // Silently handle — the client-side store manages error state
    }
  });

  socket.on("rename_session", (data: { sessionId: string; title: string }) => {
    try {
      provider.renameSession(data.sessionId, data.title);
      const sessions = provider.listSessions(50).map(toSocketSessionSummary);
      socket.emit("session_list", { sessions });
    } catch {
      // Silently handle
    }
  });

  socket.on("delete_session", (data: { sessionId: string }) => {
    try {
      provider.deleteSession(data.sessionId);
      const sessions = provider.listSessions(50).map(toSocketSessionSummary);
      socket.emit("session_list", { sessions });
    } catch {
      // Silently handle
    }
  });
}
