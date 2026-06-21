"use client";

import { useCallback, useRef } from "react";

export interface PlaybackTimelineProps {
  currentIndex: number;
  maxIndex: number;
  toolCallIndices?: number[];
  onSeek?: (index: number) => void;
}

export function PlaybackTimeline({
  currentIndex,
  maxIndex,
  toolCallIndices,
  onSeek,
}: PlaybackTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = maxIndex > 0 ? (currentIndex / maxIndex) * 100 : 0;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const index = Math.round(ratio * maxIndex);
      const clamped = Math.max(0, Math.min(index, maxIndex));
      onSeek?.(clamped);
    },
    [maxIndex, onSeek],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSeek?.(Math.max(0, currentIndex - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onSeek?.(Math.min(maxIndex, currentIndex + 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        onSeek?.(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onSeek?.(maxIndex);
      }
    },
    [currentIndex, maxIndex, onSeek],
  );

  return (
    <div className="playback-timeline relative px-3 py-1.5 bg-neutral-950 border-t border-zinc-800 select-none">
      <div
        ref={trackRef}
        className="playback-timeline-track relative h-5 flex items-center cursor-pointer rounded"
        role="slider"
        tabIndex={0}
        aria-valuenow={currentIndex}
        aria-valuemin={0}
        aria-valuemax={maxIndex}
        aria-label={`Playback timeline, message ${currentIndex} of ${maxIndex}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div
          className="playback-timeline-bg absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 rounded-full bg-zinc-800"
        />
        <div
          className="playback-timeline-fill absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-emerald-500/30"
          style={{ width: `${pct}%` }}
        />
        {toolCallIndices?.map((idx) => {
          const pos = maxIndex > 0 ? (idx / maxIndex) * 100 : 0;
          return (
            <span
              key={idx}
              className="playback-timeline-marker absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500/60"
              style={{ left: `${pos}%` }}
            />
          );
        })}
        <div
          className="playback-timeline-scrubber absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20 border border-emerald-400/50"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="text-[10px] text-zinc-400 text-center tabular-nums mt-0.5">
        {currentIndex}
      </div>
    </div>
  );
}
