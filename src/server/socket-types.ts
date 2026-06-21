// Shared socket event types — single source of truth for client/server communication.
// Keep in sync with packages/web/src/types/message.ts for client-side event types.

export interface SessionSummary {
  id: string;
  title: string;
  firstMessagePreview: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// -- Client → Server --

export interface GetSessionsEvent {
  // no payload
}

export interface LoadSessionEvent {
  sessionId: string;
}

// -- Server → Client --

export interface SessionListEvent {
  sessions: SessionSummary[];
}

export interface SessionLoadedEvent {
  sessionId: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
  }>;
}
