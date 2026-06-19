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
}

export interface ClientToServerEvents {
  client_message: (payload: ClientMessageEvent) => void;
  cancel_stream: (payload: CancelStreamEvent) => void;
}
