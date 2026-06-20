export type PlaybackSpeed = 1 | 2 | 4;

const VALID_SPEEDS: Set<PlaybackSpeed> = new Set([1, 2, 4]);

const SPEED_INTERVALS: Record<PlaybackSpeed, number> = {
  1: 2000,
  2: 1000,
  4: 500,
};

const POLL_MS = 500;

// ── Slice (state machine) ──────────────────────────────

export interface SessionPlaybackSlice {
  getIsPlaying(): boolean;
  getCurrentIndex(): number;
  getPlaybackSpeed(): PlaybackSpeed;
  getMaxIndex(): number;
  play(): void;
  pause(): void;
  stepForward(): void;
  stepBack(): void;
  jumpTo(index: number): void;
  setSpeed(speed: PlaybackSpeed): void;
  showAll(): void;
  setMaxIndex(maxIndex: number): void;
  reset(): void;
  tick(): boolean;
}

export function createSessionPlaybackSlice(): SessionPlaybackSlice {
  let isPlaying = false;
  let currentIndex = 0;
  let playbackSpeed: PlaybackSpeed = 1;
  let maxIndex = 0;

  function clampIndex(index: number): number {
    return Math.max(0, Math.min(index, maxIndex));
  }

  return {
    getIsPlaying(): boolean {
      return isPlaying;
    },

    getCurrentIndex(): number {
      return currentIndex;
    },

    getPlaybackSpeed(): PlaybackSpeed {
      return playbackSpeed;
    },

    getMaxIndex(): number {
      return maxIndex;
    },

    play(): void {
      if (currentIndex >= maxIndex) return;
      isPlaying = true;
    },

    pause(): void {
      isPlaying = false;
    },

    stepForward(): void {
      currentIndex = clampIndex(currentIndex + 1);
      if (isPlaying && currentIndex >= maxIndex) {
        isPlaying = false;
      }
    },

    stepBack(): void {
      currentIndex = clampIndex(currentIndex - 1);
    },

    jumpTo(index: number): void {
      currentIndex = clampIndex(index);
    },

    setSpeed(speed: PlaybackSpeed): void {
      if (VALID_SPEEDS.has(speed)) {
        playbackSpeed = speed;
      }
    },

    showAll(): void {
      currentIndex = maxIndex;
      isPlaying = false;
    },

    setMaxIndex(value: number): void {
      maxIndex = value;
      currentIndex = clampIndex(currentIndex);
    },

    reset(): void {
      isPlaying = false;
      currentIndex = 0;
      playbackSpeed = 1;
    },

    tick(): boolean {
      if (!isPlaying) return false;
      if (currentIndex >= maxIndex) {
        isPlaying = false;
        return false;
      }
      currentIndex++;
      if (currentIndex >= maxIndex) {
        isPlaying = false;
      }
      return true;
    },
  };
}

// ── Timer ──────────────────────────────────────────────

export interface SessionPlaybackTimer {
  start(): void;
  stop(): void;
}

export function createSessionPlaybackTimer(
  slice: SessionPlaybackSlice,
  _options: { onTick: () => void; speed: PlaybackSpeed },
): SessionPlaybackTimer {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let elapsed = 0;

  // Sync initial speed to the slice
  slice.setSpeed(_options.speed);

  function poll(): void {
    if (!slice.getIsPlaying()) return;

    elapsed += POLL_MS;
    const required = SPEED_INTERVALS[slice.getPlaybackSpeed()];

    if (elapsed >= required) {
      elapsed = 0;
      const advanced = slice.tick();
      if (advanced) {
        _options.onTick();
      }
      if (!slice.getIsPlaying()) {
        stop();
      }
    }
  }

  function start(): void {
    stop();
    elapsed = 0;
    intervalId = setInterval(poll, POLL_MS);
  }

  function stop(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { start, stop };
}
