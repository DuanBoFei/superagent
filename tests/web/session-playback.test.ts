import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createSessionPlaybackSlice,
  createSessionPlaybackTimer,
} from "../../packages/web/src/hooks/useSessionPlayback";
import type {
  SessionPlaybackSlice,
  SessionPlaybackTimer,
  PlaybackSpeed,
} from "../../packages/web/src/hooks/useSessionPlayback";

// ── Slice tests ────────────────────────────────────────

describe("SessionPlaybackSlice", () => {
  let slice: SessionPlaybackSlice;

  beforeEach(() => {
    slice = createSessionPlaybackSlice();
  });

  describe("initial state", () => {
    it("is not playing by default", () => {
      expect(slice.getIsPlaying()).toBe(false);
    });

    it("starts at index 0", () => {
      expect(slice.getCurrentIndex()).toBe(0);
    });

    it("defaults to speed 1x", () => {
      expect(slice.getPlaybackSpeed()).toBe(1);
    });

    it("has maxIndex of 0 by default", () => {
      expect(slice.getMaxIndex()).toBe(0);
    });
  });

  describe("play / pause", () => {
    it("sets isPlaying to true when play() called", () => {
      slice.setMaxIndex(10);
      slice.play();
      expect(slice.getIsPlaying()).toBe(true);
    });

    it("does not start playing if already at max index", () => {
      slice.setMaxIndex(0);
      slice.jumpTo(0);
      slice.play();
      expect(slice.getIsPlaying()).toBe(false);
    });

    it("sets isPlaying to false when pause() called", () => {
      slice.setMaxIndex(10);
      slice.play();
      slice.pause();
      expect(slice.getIsPlaying()).toBe(false);
    });
  });

  describe("stepForward / stepBack", () => {
    it("increments currentIndex on stepForward", () => {
      slice.setMaxIndex(10);
      slice.stepForward();
      expect(slice.getCurrentIndex()).toBe(1);
    });

    it("does not exceed maxIndex on stepForward", () => {
      slice.setMaxIndex(5);
      slice.jumpTo(5);
      slice.stepForward();
      expect(slice.getCurrentIndex()).toBe(5);
    });

    it("decrements currentIndex on stepBack", () => {
      slice.setMaxIndex(10);
      slice.jumpTo(5);
      slice.stepBack();
      expect(slice.getCurrentIndex()).toBe(4);
    });

    it("does not go below 0 on stepBack", () => {
      slice.stepBack();
      expect(slice.getCurrentIndex()).toBe(0);
    });

    it("auto-pauses when stepForward reaches maxIndex while playing", () => {
      slice.setMaxIndex(3);
      slice.jumpTo(2);
      slice.play();
      expect(slice.getIsPlaying()).toBe(true);
      slice.stepForward(); // now at 3 = maxIndex
      expect(slice.getCurrentIndex()).toBe(3);
      expect(slice.getIsPlaying()).toBe(false);
    });
  });

  describe("jumpTo", () => {
    it("sets currentIndex to target", () => {
      slice.setMaxIndex(10);
      slice.jumpTo(7);
      expect(slice.getCurrentIndex()).toBe(7);
    });

    it("clamps to 0 for negative values", () => {
      slice.jumpTo(-5);
      expect(slice.getCurrentIndex()).toBe(0);
    });

    it("clamps to maxIndex for out-of-range values", () => {
      slice.setMaxIndex(5);
      slice.jumpTo(999);
      expect(slice.getCurrentIndex()).toBe(5);
    });
  });

  describe("setSpeed", () => {
    it.each([1, 2, 4] as PlaybackSpeed[])("sets speed to %sx", (speed) => {
      slice.setSpeed(speed);
      expect(slice.getPlaybackSpeed()).toBe(speed);
    });

    it("rejects invalid speeds", () => {
      slice.setSpeed(3 as PlaybackSpeed);
      expect(slice.getPlaybackSpeed()).toBe(1); // unchanged
    });
  });

  describe("showAll", () => {
    it("sets currentIndex to maxIndex and pauses", () => {
      slice.setMaxIndex(42);
      slice.play();
      slice.showAll();
      expect(slice.getCurrentIndex()).toBe(42);
      expect(slice.getIsPlaying()).toBe(false);
    });
  });

  describe("setMaxIndex", () => {
    it("updates maxIndex", () => {
      slice.setMaxIndex(20);
      expect(slice.getMaxIndex()).toBe(20);
    });

    it("clamps currentIndex when maxIndex is lowered", () => {
      slice.setMaxIndex(10);
      slice.jumpTo(8);
      slice.setMaxIndex(5);
      expect(slice.getCurrentIndex()).toBe(5);
    });
  });

  describe("reset", () => {
    it("resets all state to defaults", () => {
      slice.setMaxIndex(10);
      slice.jumpTo(5);
      slice.setSpeed(2);
      slice.play();

      slice.reset();

      expect(slice.getIsPlaying()).toBe(false);
      expect(slice.getCurrentIndex()).toBe(0);
      expect(slice.getPlaybackSpeed()).toBe(1);
      expect(slice.getMaxIndex()).toBe(10); // maxIndex preserved
    });
  });

  describe("tick", () => {
    it("advances currentIndex by 1 when playing and not at end", () => {
      slice.setMaxIndex(10);
      slice.play();
      const advanced = slice.tick();
      expect(advanced).toBe(true);
      expect(slice.getCurrentIndex()).toBe(1);
    });

    it("returns false and auto-pauses when at end", () => {
      slice.setMaxIndex(3);
      slice.jumpTo(3);
      slice.play();
      const advanced = slice.tick();
      expect(advanced).toBe(false);
      expect(slice.getIsPlaying()).toBe(false);
    });

    it("does nothing when paused", () => {
      slice.setMaxIndex(10);
      slice.jumpTo(3);
      const advanced = slice.tick();
      expect(advanced).toBe(false);
      expect(slice.getCurrentIndex()).toBe(3);
    });
  });
});

// ── Timer tests ────────────────────────────────────────

describe("SessionPlaybackTimer", () => {
  let slice: SessionPlaybackSlice;
  let timer: SessionPlaybackTimer;
  let onTick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    slice = createSessionPlaybackSlice();
    onTick = vi.fn();
  });

  afterEach(() => {
    timer?.stop();
    vi.useRealTimers();
  });

  function createTimer(speed: PlaybackSpeed = 1): void {
    timer = createSessionPlaybackTimer(slice, { onTick, speed });
  }

  it("calls onTick on each interval when playing", () => {
    slice.setMaxIndex(10);
    createTimer(1);
    timer.start();
    slice.play();

    // 1x speed = 2000ms per step
    vi.advanceTimersByTime(2000);
    expect(onTick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it("respects speed multiplier (2x = 1000ms per step)", () => {
    slice.setMaxIndex(20);
    createTimer(2);
    timer.start();
    slice.play();

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it("respects speed multiplier (4x = 500ms per step)", () => {
    slice.setMaxIndex(40);
    createTimer(4);
    timer.start();
    slice.play();

    vi.advanceTimersByTime(500);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("stops calling onTick when paused", () => {
    slice.setMaxIndex(10);
    createTimer(1);
    timer.start();
    slice.play();

    vi.advanceTimersByTime(2000);
    expect(onTick).toHaveBeenCalledTimes(1);

    slice.pause();
    vi.advanceTimersByTime(10000);
    expect(onTick).toHaveBeenCalledTimes(1); // no more calls
  });

  it("stops calling onTick when end reached", () => {
    slice.setMaxIndex(1);
    createTimer(1);
    timer.start();
    slice.play();

    vi.advanceTimersByTime(2000);
    expect(onTick).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    // Still only 1 — index was 0, after one tick it's 1 which is maxIndex
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("stop() prevents further ticks", () => {
    slice.setMaxIndex(10);
    createTimer(1);
    timer.start();
    slice.play();

    vi.advanceTimersByTime(2000);
    expect(onTick).toHaveBeenCalledTimes(1);

    timer.stop();
    vi.advanceTimersByTime(10000);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it("handles speed change while running", () => {
    slice.setMaxIndex(20);
    createTimer(1);
    timer.start();
    slice.play();

    vi.advanceTimersByTime(2000);
    expect(onTick).toHaveBeenCalledTimes(1);

    slice.setSpeed(4);
    vi.advanceTimersByTime(500);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it("restart after stop works", () => {
    slice.setMaxIndex(10);
    createTimer(1);
    timer.start();
    slice.play();

    vi.advanceTimersByTime(2000);
    timer.stop();
    vi.advanceTimersByTime(5000);

    timer.start();
    slice.play();
    vi.advanceTimersByTime(2000);
    expect(onTick).toHaveBeenCalledTimes(2);
  });
});
