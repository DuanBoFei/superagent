import type { Message } from "./message";
import type { ToolCardState } from "./cards";

// ── Session Status ──────────────────────────────────────

export type SessionStatus = "active" | "completed" | "error";

// ── Session Summary (list item) ─────────────────────────

export interface SessionSummary {
  id: string;
  title: string;
  firstMessagePreview: string;
  createdAt: number;
  updatedAt: number;
  durationMs: number;
  toolCallCount: number;
  messageCount: number;
  status: SessionStatus;
  tags: string[];
  forkedFrom: string | null;
}

// ── Session (full data for playback/export) ─────────────

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  durationMs: number;
  toolCallCount: number;
  messageCount: number;
  status: SessionStatus;
  tags: string[];
  forkedFrom: string | null;
  forkedAtMessageIndex: number | null;
  messages: Message[];
  toolCalls: ToolCardState[];
}

// ── Search Query ────────────────────────────────────────

export interface DateRange {
  start: number;
  end: number;
}

export interface SearchQuery {
  text: string;
  dateRange: DateRange | null;
  statusFilter: SessionStatus[] | null;
  tagsFilter: string[] | null;
}

// ── Export Format V1 ────────────────────────────────────

export interface ExportFormatV1 {
  version: 1;
  exportedAt: number;
  exportedBy: string;
  sessions: Session[];
}

// ── Playback State ──────────────────────────────────────

export type PlaybackSpeed = 1 | 2 | 4;

export interface PlaybackState {
  isPlaying: boolean;
  currentMessageIndex: number;
  playbackSpeed: PlaybackSpeed;
}
