import type { Session } from "../../types/session-history";
import type { ChatStore } from "../../store/chat";
import type { SessionHistorySlice } from "../../store/slices/session-history.slice";
import type { SessionPlaybackSlice } from "../../hooks/useSessionPlayback";
import type { SessionDbService } from "../../services/session-db.service";
import { forkSession } from "./SessionForkDialog";
import { escapeHtml } from "./escape";

// ── Types ───────────────────────────────────────────────

export interface PlaybackBannerOptions {
  sessionTitle: string;
  messageCount: number;
  currentIndex: number;
  onResume?: () => void;
}

export interface PlaybackBannerController {
  attach(): void;
  detach(): void;
}

export interface SessionChatBridgeOptions {
  chatStore: ChatStore;
  historySlice: SessionHistorySlice;
  playbackSlice: SessionPlaybackSlice;
  dbService: SessionDbService;
}

export interface SessionChatBridge {
  getViewMode(): "live" | "playback";
  getCurrentSession(): Session | null;
  loadSessionIntoChat(sessionId: string): Promise<void>;
  resumeLiveChat(): void;
  handleSendMessage(content: string): { forked: boolean; newSessionId?: string };
  getPlaybackBannerHtml(): string;
}

// ── Render ──────────────────────────────────────────────

export function renderPlaybackBanner(options: PlaybackBannerOptions): string {
  const { sessionTitle, messageCount, currentIndex } = options;
  const displayIndex = currentIndex + 1;

  return `<div class="playback-banner flex items-center gap-3 px-4 py-2.5 bg-amber-900/20 border-b border-amber-500/20 text-[13px] select-none">
    <span class="playback-banner-icon text-amber-500">&#9654;</span>
    <span class="playback-banner-text text-neutral-300">
      <span class="text-amber-400 font-medium">Viewing history</span>
      <span class="text-neutral-500 mx-1.5">·</span>
      <span class="playback-banner-title text-neutral-300">${escapeHtml(sessionTitle)}</span>
      <span class="text-neutral-500 mx-1.5">·</span>
      <span class="playback-banner-progress text-neutral-400">${displayIndex} / ${messageCount}</span>
    </span>
    <button class="playback-banner-resume ml-auto text-[12px] px-3 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors border border-amber-500/20" data-action="resume-live" type="button">Resume live chat</button>
  </div>`;
}

// ── Banner Controller ───────────────────────────────────

export function createPlaybackBannerController(
  el: HTMLElement,
  options: PlaybackBannerOptions,
): PlaybackBannerController {
  const { onResume } = options;

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const resumeBtn = target.closest<HTMLElement>('[data-action="resume-live"]');
    if (resumeBtn) {
      onResume?.();
    }
  }

  return {
    attach(): void {
      el.addEventListener("click", onClick);
    },
    detach(): void {
      el.removeEventListener("click", onClick);
    },
  };
}

// ── Bridge ──────────────────────────────────────────────

export function createSessionChatBridge(
  options: SessionChatBridgeOptions,
): SessionChatBridge {
  const { chatStore, historySlice, playbackSlice, dbService } = options;

  let viewMode: "live" | "playback" = "live";
  let currentSession: Session | null = null;

  return {
    getViewMode(): "live" | "playback" {
      return viewMode;
    },

    getCurrentSession(): Session | null {
      return currentSession;
    },

    async loadSessionIntoChat(sessionId: string): Promise<void> {
      const session = await dbService.getSession(sessionId);
      if (!session) return;

      currentSession = session;
      viewMode = "playback";

      playbackSlice.reset();
      playbackSlice.setMaxIndex(session.messages.length - 1);

      chatStore.replaceMessages(session.messages);
      historySlice.selectSession(session.id);
    },

    resumeLiveChat(): void {
      currentSession = null;
      viewMode = "live";
      playbackSlice.pause();

      chatStore.replaceMessages([]);
      historySlice.deselectSession();
    },

    handleSendMessage(
      content: string,
    ): { forked: boolean; newSessionId?: string } {
      if (viewMode === "live") {
        return { forked: false };
      }

      if (!content.trim() || !currentSession) {
        return { forked: false };
      }

      const forkIndex = playbackSlice.getCurrentIndex();
      const newSession = forkSession(currentSession, forkIndex);

      currentSession = newSession;
      viewMode = "live";
      playbackSlice.pause();
      playbackSlice.reset();

      historySlice.selectSession(newSession.id);

      return { forked: true, newSessionId: newSession.id };
    },

    getPlaybackBannerHtml(): string {
      if (viewMode !== "playback" || !currentSession) return "";

      return renderPlaybackBanner({
        sessionTitle: currentSession.title,
        messageCount: currentSession.messages.length,
        currentIndex: playbackSlice.getCurrentIndex(),
      });
    },
  };
}
