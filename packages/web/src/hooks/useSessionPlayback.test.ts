import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSessionPlaybackSlice,
  createSessionPlaybackTimer,
  type SessionPlaybackSlice,
} from "./useSessionPlayback";
import type { PlaybackSpeed } from "./useSessionPlayback";

function makeSliceWithMax(maxIndex: number): SessionPlaybackSlice {
  const s = createSessionPlaybackSlice();
  s.setMaxIndex(maxIndex);
  return s;
}

describe("createSessionPlaybackSlice", () => {
  describe("initial state", () => {
    it("is not playing", () => {
      const s = createSessionPlaybackSlice();
      expect(s.getIsPlaying()).toBe(false);
    });

    it("has current index 0", () => {
      const s = createSessionPlaybackSlice();
      expect(s.getCurrentIndex()).toBe(0);
    });

    it("has speed 1", () => {
      const s = createSessionPlaybackSlice();
      expect(s.getPlaybackSpeed()).toBe(1);
    });

    it("has max index 0", () => {
      const s = createSessionPlaybackSlice();
      expect(s.getMaxIndex()).toBe(0);
    });
  });

  describe("play / pause", () => {
    it("starts playing", () => {
      const s = makeSliceWithMax(5);
      s.play();
      expect(s.getIsPlaying()).toBe(true);
    });

    it("pauses", () => {
      const s = makeSliceWithMax(5);
      s.play();
      s.pause();
      expect(s.getIsPlaying()).toBe(false);
    });

    it("does not play when at end", () => {
      const s = makeSliceWithMax(5);
      s.jumpTo(5);
      s.play();
      expect(s.getIsPlaying()).toBe(false);
    });
  });

  describe("stepForward", () => {
    it("increments current index", () => {
      const s = makeSliceWithMax(5);
      s.stepForward();
      expect(s.getCurrentIndex()).toBe(1);
    });

    it("clamps to max index", () => {
      const s = makeSliceWithMax(3);
      s.stepForward();
      s.stepForward();
      s.stepForward();
      s.stepForward();
      expect(s.getCurrentIndex()).toBe(3);
    });

    it("auto-pauses when reaching end while playing", () => {
      const s = makeSliceWithMax(2);
      s.play();
      s.stepForward();
      s.stepForward();
      expect(s.getIsPlaying()).toBe(false);
    });
  });

  describe("stepBack", () => {
    it("decrements current index", () => {
      const s = makeSliceWithMax(5);
      s.jumpTo(3);
      s.stepBack();
      expect(s.getCurrentIndex()).toBe(2);
    });

    it("clamps to 0", () => {
      const s = makeSliceWithMax(5);
      s.stepBack();
      expect(s.getCurrentIndex()).toBe(0);
    });
  });

  describe("jumpTo", () => {
    it("jumps to specified index", () => {
      const s = makeSliceWithMax(10);
      s.jumpTo(7);
      expect(s.getCurrentIndex()).toBe(7);
    });

    it("clamps to valid range", () => {
      const s = makeSliceWithMax(10);
      s.jumpTo(100);
      expect(s.getCurrentIndex()).toBe(10);
      s.jumpTo(-5);
      expect(s.getCurrentIndex()).toBe(0);
    });
  });

  describe("setSpeed", () => {
    it("sets valid speed", () => {
      const s = createSessionPlaybackSlice();
      s.setSpeed(2 as PlaybackSpeed);
      expect(s.getPlaybackSpeed()).toBe(2);
    });

    it("rejects invalid speed", () => {
      const s = createSessionPlaybackSlice();
      s.setSpeed(3 as PlaybackSpeed);
      expect(s.getPlaybackSpeed()).toBe(1);
    });
  });

  describe("showAll", () => {
    it("jumps to max and pauses", () => {
      const s = makeSliceWithMax(10);
      s.play();
      s.showAll();
      expect(s.getCurrentIndex()).toBe(10);
      expect(s.getIsPlaying()).toBe(false);
    });
  });

  describe("setMaxIndex", () => {
    it("sets max and clamps current", () => {
      const s = makeSliceWithMax(10);
      s.jumpTo(8);
      s.setMaxIndex(5);
      expect(s.getMaxIndex()).toBe(5);
      expect(s.getCurrentIndex()).toBe(5);
    });
  });

  describe("reset", () => {
    it("resets to initial state", () => {
      const s = makeSliceWithMax(10);
      s.play();
      s.jumpTo(5);
      s.setSpeed(4 as PlaybackSpeed);
      s.reset();
      expect(s.getIsPlaying()).toBe(false);
      expect(s.getCurrentIndex()).toBe(0);
      expect(s.getPlaybackSpeed()).toBe(1);
    });
  });

  describe("tick", () => {
    it("returns false when not playing", () => {
      const s = makeSliceWithMax(5);
      expect(s.tick()).toBe(false);
    });

    it("returns true and advances when playing", () => {
      const s = makeSliceWithMax(5);
      s.play();
      expect(s.tick()).toBe(true);
      expect(s.getCurrentIndex()).toBe(1);
    });

    it("auto-pauses when reaching max", () => {
      const s = makeSliceWithMax(1);
      s.play();
      s.tick();
      expect(s.getIsPlaying()).toBe(false);
      expect(s.tick()).toBe(false);
    });
  });
});

describe("createSessionPlaybackTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts polling", () => {
    const slice = makeSliceWithMax(5);
    slice.play();
    const onTick = vi.fn();
    const timer = createSessionPlaybackTimer(slice, {
      onTick,
      speed: 2 as PlaybackSpeed,
    });

    timer.start();

    // Speed 2 = 1000ms interval. Poll runs every 500ms.
    // After 500ms no tick (elapsed=500 < 1000)
    vi.advanceTimersByTime(500);
    expect(onTick).not.toHaveBeenCalled();

    // After 1000ms total → tick fires
    vi.advanceTimersByTime(500);
    expect(onTick).toHaveBeenCalledTimes(1);

    timer.stop();
  });

  it("stop halts polling", () => {
    const slice = makeSliceWithMax(5);
    slice.play();
    const onTick = vi.fn();
    const timer = createSessionPlaybackTimer(slice, {
      onTick,
      speed: 1 as PlaybackSpeed,
    });

    timer.start();
    timer.stop();

    vi.advanceTimersByTime(3000);
    expect(onTick).not.toHaveBeenCalled();
  });

  it("syncs speed to the slice on creation", () => {
    const slice = createSessionPlaybackSlice();
    createSessionPlaybackTimer(slice, {
      onTick: vi.fn(),
      speed: 4 as PlaybackSpeed,
    });
    expect(slice.getPlaybackSpeed()).toBe(4);
  });

  it("does not fire ticks when paused", () => {
    const slice = makeSliceWithMax(5);
    const onTick = vi.fn();
    const timer = createSessionPlaybackTimer(slice, {
      onTick,
      speed: 1 as PlaybackSpeed,
    });

    timer.start();
    vi.advanceTimersByTime(5000);
    expect(onTick).not.toHaveBeenCalled();

    timer.stop();
  });

  it("auto-stops when playback ends", () => {
    const slice = makeSliceWithMax(1);
    slice.play();
    const onTick = vi.fn();
    const timer = createSessionPlaybackTimer(slice, {
      onTick,
      speed: 1 as PlaybackSpeed,
    });

    timer.start();
    vi.advanceTimersByTime(2000);
    // tick fired, reached max, timer should be stopped
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(slice.getIsPlaying()).toBe(false);
    expect(slice.getCurrentIndex()).toBe(1);

    // No more ticks
    vi.advanceTimersByTime(10000);
    expect(onTick).toHaveBeenCalledTimes(1);
  });
});
