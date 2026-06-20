import type { SessionPlaybackSlice } from "../../hooks/useSessionPlayback";

export interface PlaybackTimelineOptions {
  slice: SessionPlaybackSlice;
  currentIndex: number;
  toolCallIndices?: number[];
  onStateChange?: () => void;
}

export interface PlaybackTimelineController {
  attach(): void;
  detach(): void;
}

// ── Render ─────────────────────────────────────────────

export function renderPlaybackTimeline(options: PlaybackTimelineOptions): string {
  const { currentIndex, toolCallIndices } = options;
  const maxIndex = options.slice.getMaxIndex();
  const pct = maxIndex > 0 ? (currentIndex / maxIndex) * 100 : 0;

  const markers = toolCallIndices?.length
    ? toolCallIndices
        .map(
          (idx) => {
            const pos = maxIndex > 0 ? (idx / maxIndex) * 100 : 0;
            return `<span class="playback-timeline-marker absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500/60" style="left:${pos}%"></span>`;
          },
        )
        .join("")
    : "";

  return `<div class="playback-timeline relative px-3 py-1.5 bg-neutral-950 border-t border-neutral-800 select-none">
    <div class="playback-timeline-track relative h-5 flex items-center cursor-pointer rounded" role="slider" tabindex="0" aria-valuenow="${currentIndex}" aria-valuemin="0" aria-valuemax="${maxIndex}" aria-label="Playback timeline, message ${currentIndex} of ${maxIndex}">
      <div class="playback-timeline-fill absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-emerald-500/30" style="width:${pct}%"></div>
      <div class="playback-timeline-bg absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 rounded-full bg-neutral-800"></div>
      ${markers}
      <div class="playback-timeline-scrubber absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20 border border-emerald-400/50" style="left:${pct}%"></div>
    </div>
    <div class="playback-timeline-label text-[10px] text-neutral-400 text-center tabular-nums mt-0.5">${currentIndex}</div>
  </div>`;
}

// ── Controller ─────────────────────────────────────────

export function createPlaybackTimelineController(
  el: HTMLElement,
  options: PlaybackTimelineOptions,
): PlaybackTimelineController {
  const { slice, onStateChange } = options;

  function onClick(e: MouseEvent): void {
    const track = (e.target as HTMLElement).closest<HTMLElement>(".playback-timeline-track");
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * slice.getMaxIndex());
    const clamped = Math.max(0, Math.min(index, slice.getMaxIndex()));

    slice.jumpTo(clamped);
    onStateChange?.();
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
