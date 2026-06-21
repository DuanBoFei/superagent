import type { MarkdownNode, MarkdownPartialStructure } from "./markdown";

export type MessageRole = "user" | "assistant";

export type MessageStatus = "pending" | "sending" | "streaming" | "sent" | "error" | "cancelled";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  status: MessageStatus;
  error?: string;
  ast?: MarkdownNode[];
  partialStructure?: MarkdownPartialStructure;
}

export interface TokenUsageStats {
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface SessionStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedOutputTokens: number;
}

export interface ClientMessageEvent {
  messageId: string;
  sessionId: string;
  content: string;
  timestamp: number;
}

export interface StreamTokenEvent {
  messageId: string;
  sessionId: string;
  token: string;
}

export interface MessageCompleteEvent {
  messageId: string;
  sessionId: string;
  stats?: TokenUsageStats;
}

export interface MessageErrorEvent {
  messageId: string;
  sessionId: string;
  code: string;
  message: string;
  retryable: boolean;
}

export interface CancelStreamEvent {
  messageId: string;
  sessionId: string;
}

export interface ServerToClientEvents {
  stream_token: (payload: StreamTokenEvent) => void;
  message_complete: (payload: MessageCompleteEvent) => void;
  message_error: (payload: MessageErrorEvent) => void;
  session_list: (payload: { sessions: unknown[] }) => void;
  session_loaded: (payload: { sessionId: string; messages: unknown[] }) => void;
}

export interface ClientToServerEvents {
  client_send: (payload: ClientMessageEvent) => void;
  abort_turn: (payload: { messageId: string }) => void;
  get_sessions: () => void;
  load_session: (payload: { sessionId: string }) => void;
}
