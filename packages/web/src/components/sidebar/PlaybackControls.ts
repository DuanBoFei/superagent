import type { SessionPlaybackSlice } from "../../hooks/useSessionPlayback";

export interface PlaybackControlsOptions {
  slice: SessionPlaybackSlice;
  currentIndex: number;
  isPlaying: boolean;
  onStateChange?: () => void;
}

export interface PlaybackControlsController {
  attach(): void;
  detach(): void;
}

// ── Render ─────────────────────────────────────────────

export function renderPlaybackControls(options: PlaybackControlsOptions): string {
  const { slice, currentIndex, isPlaying } = options;
  const maxIndex = slice.getMaxIndex();
  const speed = slice.getPlaybackSpeed();
  const atStart = currentIndex === 0;
  const atEnd = currentIndex >= maxIndex;

  const playBtnClass = `playback-play-btn flex items-center justify-center rounded w-9 h-9 transition-colors ${
    isPlaying
      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
  }`;

  const playAction = isPlaying ? "pause" : "play";
  const playIcon = isPlaying
    ? `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="3" height="10" rx="0.5"/><rect x="9" y="3" width="3" height="10" rx="0.5"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l9 5-9 5V3z"/></svg>`;

  const stepBtnClass = (disabled: boolean): string =>
    `playback-step-btn flex items-center justify-center rounded w-7 h-7 text-neutral-400 transition-colors ${
      disabled
        ? "opacity-30 cursor-not-allowed"
        : "hover:text-neutral-200 hover:bg-neutral-800"
    }`;

  const speedBtns = ([1, 2, 4] as const)
    .map(
      (s) =>
        `<button class="playback-speed-btn text-[11px] px-1.5 py-0.5 rounded border transition-colors ${
          s === speed
            ? "playback-speed-active border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : "border-neutral-700 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300"
        }" data-action="set-speed" data-speed="${s}" type="button">${s}x</button>`,
    )
    .join("");

  return `<div class="playback-controls flex items-center gap-2 px-3 py-2 bg-neutral-950 border-t border-neutral-800 select-none">
    <div class="flex items-center gap-1">
      <button class="${stepBtnClass(atStart)}" data-action="step-back" type="button" aria-label="Step back"${atStart ? " disabled" : ""}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4l-4 4 4 4M6 5v6"/></svg>
      </button>

      <button class="${playBtnClass}" data-action="${playAction}" type="button" aria-label="${isPlaying ? "Pause" : "Play"}"${atEnd && !isPlaying ? " disabled" : ""}>
        ${playIcon}
      </button>

      <button class="${stepBtnClass(atEnd)}" data-action="step-forward" type="button" aria-label="Step forward"${atEnd ? " disabled" : ""}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4l4 4-4 4M10 5v6"/></svg>
      </button>
    </div>

    <div class="flex items-center gap-0.5 ml-1">
      ${speedBtns}
    </div>

    <div class="flex items-center gap-1 ml-auto">
      <span class="playback-progress text-[11px] text-neutral-400 tabular-nums min-w-[64px] text-right">
        <span class="text-neutral-200">${currentIndex}</span>
        <span class="text-neutral-600"> / ${maxIndex}</span>
      </span>

      <button class="playback-show-all-btn text-[11px] px-2 py-1 rounded border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors" data-action="show-all" type="button" aria-label="Show all messages">
        Show all
      </button>
    </div>
  </div>`;
}

// ── Controller ─────────────────────────────────────────

export function createPlaybackControlsController(
  el: HTMLElement,
  options: PlaybackControlsOptions,
): PlaybackControlsController {
  const { slice, onStateChange } = options;

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    const playBtn = target.closest<HTMLElement>('[data-action="play"]');
    if (playBtn) {
      slice.play();
      onStateChange?.();
      return;
    }

    const pauseBtn = target.closest<HTMLElement>('[data-action="pause"]');
    if (pauseBtn) {
      slice.pause();
      onStateChange?.();
      return;
    }

    const stepFwd = target.closest<HTMLElement>('[data-action="step-forward"]');
    if (stepFwd) {
      slice.stepForward();
      onStateChange?.();
      return;
    }

    const stepBack = target.closest<HTMLElement>('[data-action="step-back"]');
    if (stepBack) {
      slice.stepBack();
      onStateChange?.();
      return;
    }

    const showAllBtn = target.closest<HTMLElement>('[data-action="show-all"]');
    if (showAllBtn) {
      slice.showAll();
      onStateChange?.();
      return;
    }

    const speedBtn = target.closest<HTMLElement>('[data-action="set-speed"]');
    if (speedBtn) {
      const s = speedBtn.getAttribute("data-speed");
      if (s) {
        slice.setSpeed(Number(s) as 1 | 2 | 4);
        onStateChange?.();
      }
    }
  }

  function onKeydown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

    switch (e.key) {
      case " ":
        e.preventDefault();
        if (slice.getIsPlaying()) {
          slice.pause();
        } else {
          slice.play();
        }
        onStateChange?.();
        break;
      case "ArrowLeft":
        e.preventDefault();
        slice.stepBack();
        onStateChange?.();
        break;
      case "ArrowRight":
        e.preventDefault();
        slice.stepForward();
        onStateChange?.();
        break;
      case "Home":
        e.preventDefault();
        slice.jumpTo(0);
        onStateChange?.();
        break;
      case "End":
        e.preventDefault();
        slice.jumpTo(slice.getMaxIndex());
        onStateChange?.();
        break;
    }
  }

  return {
    attach(): void {
      el.addEventListener("click", onClick);
      el.addEventListener("keydown", onKeydown);
    },

    detach(): void {
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKeydown);
    },
  };
}
