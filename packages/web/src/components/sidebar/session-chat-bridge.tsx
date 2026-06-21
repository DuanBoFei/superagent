"use client";

import type { Session } from "../../types/session-history";
import { useCallback, useRef, useState } from "react";
import { useChatStore } from "../../store/chat";
import { useSessionHistoryStore } from "../../store/session-history";
import { forkSession } from "./session-fork-dialog";

export interface PlaybackSlice {
  getIsPlaying(): boolean;
  getCurrentIndex(): number;
  getPlaybackSpeed(): number;
  getMaxIndex(): number;
  play(): void;
  pause(): void;
  stepForward(): void;
  stepBack(): void;
  jumpTo(index: number): void;
  setSpeed(speed: number): void;
  showAll(): void;
  setMaxIndex(maxIndex: number): void;
  reset(): void;
  tick(): boolean;
}

export interface SessionChatBridge {
  getViewMode(): "live" | "playback";
  getCurrentSession(): Session | null;
  loadSessionIntoChat(session: Session): void;
  resumeLiveChat(): void;
  handleSendMessage(content: string): { forked: boolean; newSessionId?: string };
}

export function useSessionChatBridge(playbackSlice: PlaybackSlice): SessionChatBridge {
  const viewModeRef = useRef<"live" | "playback">("live");
  const currentSessionRef = useRef<Session | null>(null);
  const [viewMode, setViewMode] = useState<"live" | "playback">("live");

  const loadSessionIntoChat = useCallback(
    (session: Session) => {
      currentSessionRef.current = session;
      viewModeRef.current = "playback";
      setViewMode("playback");

      playbackSlice.reset();
      playbackSlice.setMaxIndex(session.messages.length - 1);

      const chatStore = useChatStore.getState();
      chatStore.reset();
      for (const msg of session.messages) {
        chatStore.addMessage({ ...msg, status: "sent" });
      }

      useSessionHistoryStore.getState().selectSession(session.id);
    },
    [playbackSlice],
  );

  const resumeLiveChat = useCallback(() => {
    currentSessionRef.current = null;
    viewModeRef.current = "live";
    setViewMode("live");
    playbackSlice.pause();

    useChatStore.getState().reset();
    useSessionHistoryStore.getState().deselectSession();
  }, [playbackSlice]);

  const handleSendMessage = useCallback(
    (content: string): { forked: boolean; newSessionId?: string } => {
      if (viewModeRef.current === "live") {
        return { forked: false };
      }

      const currentSession = currentSessionRef.current;
      if (!content.trim() || !currentSession) {
        return { forked: false };
      }

      const forkIndex = playbackSlice.getCurrentIndex();
      const newSession = forkSession(currentSession, forkIndex);

      currentSessionRef.current = newSession;
      viewModeRef.current = "live";
      setViewMode("live");
      playbackSlice.pause();
      playbackSlice.reset();

      useSessionHistoryStore.getState().selectSession(newSession.id);

      return { forked: true, newSessionId: newSession.id };
    },
    [playbackSlice],
  );

  return {
    getViewMode: () => viewModeRef.current,
    getCurrentSession: () => currentSessionRef.current,
    loadSessionIntoChat,
    resumeLiveChat,
    handleSendMessage,
  };
}

// ── Playback Banner Component ───────────────────────────

export interface PlaybackBannerProps {
  sessionTitle: string;
  messageCount: number;
  currentIndex: number;
  onResume?: () => void;
}

export function PlaybackBanner({
  sessionTitle,
  messageCount,
  currentIndex,
  onResume,
}: PlaybackBannerProps) {
  const displayIndex = currentIndex + 1;

  return (
    <div className="playback-banner flex items-center gap-3 px-4 py-2.5 bg-amber-900/20 border-b border-amber-500/20 text-[13px] select-none">
      <span className="text-amber-500">&#9654;</span>
      <span className="text-zinc-300">
        <span className="text-amber-400 font-medium">Viewing history</span>
        <span className="text-zinc-500 mx-1.5">&middot;</span>
        <span className="text-zinc-300">{sessionTitle}</span>
        <span className="text-zinc-500 mx-1.5">&middot;</span>
        <span className="text-zinc-400">
          {displayIndex} / {messageCount}
        </span>
      </span>
      <button
        className="ml-auto text-[12px] px-3 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors border border-amber-500/20"
        onClick={onResume}
        type="button"
      >
        Resume live chat
      </button>
    </div>
  );
}
