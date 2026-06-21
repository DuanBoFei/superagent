"use client";

import { useCallback, useEffect } from "react";

export type PlaybackSpeed = 1 | 2 | 4;

export interface PlaybackControlsProps {
  currentIndex: number;
  maxIndex: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  onPlay?: () => void;
  onPause?: () => void;
  onStepForward?: () => void;
  onStepBack?: () => void;
  onSetSpeed?: (speed: PlaybackSpeed) => void;
  onShowAll?: () => void;
}

const SPEEDS: PlaybackSpeed[] = [1, 2, 4];

export function PlaybackControls({
  currentIndex,
  maxIndex,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onSetSpeed,
  onShowAll,
}: PlaybackControlsProps) {
  const atStart = currentIndex === 0;
  const atEnd = currentIndex >= maxIndex;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (isPlaying) onPause?.();
          else onPlay?.();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onStepBack?.();
          break;
        case "ArrowRight":
          e.preventDefault();
          onStepForward?.();
          break;
        case "Home":
          e.preventDefault();
          break;
        case "End":
          e.preventDefault();
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPlaying, onPlay, onPause, onStepForward, onStepBack]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) onPause?.();
    else onPlay?.();
  }, [isPlaying, onPlay, onPause]);

  return (
    <div
      className="playback-controls motion-reduce flex items-center gap-2 px-3 py-2 bg-neutral-950 border-t border-zinc-800 select-none"
      role="region"
      aria-label="Playback controls"
      aria-live="polite"
    >
      <div className="flex items-center gap-1">
        <button
          className={`playback-step-btn flex items-center justify-center rounded w-7 h-7 text-zinc-400 transition-colors ${
            atStart ? "opacity-30 cursor-not-allowed" : "hover:text-zinc-200 hover:bg-zinc-800"
          }`}
          disabled={atStart}
          onClick={onStepBack}
          type="button"
          aria-label="Step back"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11 4l-4 4 4 4M6 5v6" />
          </svg>
        </button>

        <button
          className={`playback-play-btn flex items-center justify-center rounded w-9 h-9 transition-colors ${
            isPlaying
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
          }`}
          disabled={atEnd && !isPlaying}
          onClick={handlePlayPause}
          type="button"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <rect x="4" y="3" width="3" height="10" rx="0.5" />
              <rect x="9" y="3" width="3" height="10" rx="0.5" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 3l9 5-9 5V3z" />
            </svg>
          )}
        </button>

        <button
          className={`playback-step-btn flex items-center justify-center rounded w-7 h-7 text-zinc-400 transition-colors ${
            atEnd ? "opacity-30 cursor-not-allowed" : "hover:text-zinc-200 hover:bg-zinc-800"
          }`}
          disabled={atEnd}
          onClick={onStepForward}
          type="button"
          aria-label="Step forward"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 4l4 4-4 4M10 5v6" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-0.5 ml-1">
        {SPEEDS.map((s) => (
          <button
            key={s}
            className={`text-[11px] px-1.5 py-0.5 rounded border transition-colors ${
              s === speed
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
            }`}
            onClick={() => onSetSpeed?.(s)}
            type="button"
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <span className="text-[11px] text-zinc-400 tabular-nums min-w-[64px] text-right">
          <span className="text-zinc-200">{currentIndex}</span>
          <span className="text-zinc-500"> / {maxIndex}</span>
        </span>

        <button
          className="text-[11px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
          onClick={onShowAll}
          type="button"
          aria-label="Show all messages"
        >
          Show all
        </button>
      </div>
    </div>
  );
}
