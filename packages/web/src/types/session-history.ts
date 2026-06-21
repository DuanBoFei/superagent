import type { Message } from "./message";
import type { ToolCardState } from "./cards";

// ── Session Summary (list item, aligned with socket SessionSummary) ──

export interface SessionSummary {
  id: string;
  title: string;
  firstMessagePreview: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// ── Session (full data for playback/export) ─────────────

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
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
