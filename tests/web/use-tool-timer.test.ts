import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createToolTimer, type ToolTimerController, type ToolTimerState } from "../../packages/web/src/hooks/use-tool-timer";

// ── Helpers ──────────────────────────────────────────

function setup() {
  let rafId = 0;
  const rafCallbacks = new Map<number, FrameRequestCallback>();
  let currentTime = 1000000;

  const mockRaf = vi.fn((cb: FrameRequestCallback): number => {
    const id = ++rafId;
    rafCallbacks.set(id, cb);
    return id;
  });

  const mockCaf = vi.fn((id: number): void => {
    rafCallbacks.delete(id);
  });

  const mockNow = vi.fn(() => currentTime);

  vi.stubGlobal("requestAnimationFrame", mockRaf);
  vi.stubGlobal("cancelAnimationFrame", mockCaf);
  vi.stubGlobal("Date", { ...Date, now: mockNow });

  function advanceTime(ms: number) {
    const endTime = currentTime + ms;
    do {
      currentTime = Math.min(currentTime + 1000, endTime);
      const snapshot = [...rafCallbacks.entries()];
      rafCallbacks.clear();
      for (const [id, cb] of snapshot) {
        cb(currentTime);
      }
    } while (currentTime < endTime);
  }

  function createTimer(): ToolTimerController {
    return createToolTimer();
  }

  return { createTimer, advanceTime, mockNow, mockRaf, mockCaf };
}

// ── Time Formatting ──────────────────────────────────

describe("time formatting", () => {
  let timer: ToolTimerController;
  let states: ToolTimerState[];

  function collect(ctrl: ToolTimerController): ToolTimerState[] {
    const result: ToolTimerState[] = [];
    ctrl.onUpdate((s) => result.push(s));
    return result;
  }

  beforeEach(() => {
    const { createTimer, advanceTime, mockNow } = setup();
    timer = createTimer();
    states = collect(timer);
    timer.start(mockNow(), null);
    advanceTime(0); // initial tick
  });

  afterEach(() => {
    timer.destroy();
    vi.unstubAllGlobals();
  });

  it("formats 0 seconds as 00:00", () => {
    expect(states[states.length - 1].formatted).toBe("00:00");
  });

  it("formats seconds correctly", () => {
    const { advanceTime } = setup();
    // We need fresh setup, use the existing one
    expect(states[states.length - 1].formatted).toBe("00:00");
  });
});

describe("formatTime pure function", () => {
  // Imported indirectly through timer
  it("formats 0 as 00:00", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    timer.onUpdate((s) => results.push(s));
    timer.start(mockNow(), null);
    advanceTime(0);
    expect(results[results.length - 1].formatted).toBe("00:00");
    timer.destroy();
    vi.unstubAllGlobals();
  });

  it("formats 65 seconds as 01:05", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    timer.onUpdate((s) => results.push(s));
    timer.start(mockNow(), null);
    advanceTime(65000); // 65 seconds
    expect(results[results.length - 1].formatted).toBe("01:05");
    timer.destroy();
    vi.unstubAllGlobals();
  });

  it("formats 3661 seconds as 61:01", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    timer.onUpdate((s) => results.push(s));
    timer.start(mockNow(), null);
    advanceTime(3661000);
    expect(results[results.length - 1].formatted).toBe("61:01");
    timer.destroy();
    vi.unstubAllGlobals();
  });
});

// ── Running State ────────────────────────────────────

describe("running state", () => {
  it("is true when endTime is null", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    timer.onUpdate((s) => results.push(s));
    timer.start(mockNow(), null);
    advanceTime(0);
    expect(results[results.length - 1].running).toBe(true);
    timer.destroy();
    vi.unstubAllGlobals();
  });

  it("is false when endTime is provided", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    timer.onUpdate((s) => results.push(s));
    const start = mockNow();
    const end = start + 5000; // 5 seconds later
    timer.start(start, end);
    advanceTime(0);
    expect(results[results.length - 1].running).toBe(false);
    expect(results[results.length - 1].formatted).toBe("00:05");
    timer.destroy();
    vi.unstubAllGlobals();
  });
});

// ── Update Behavior ──────────────────────────────────

describe("update behavior", () => {
  it("updates approximately every second while running", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    timer.onUpdate((s) => results.push(s));
    timer.start(mockNow(), null);
    advanceTime(3500); // simulate 3.5 seconds passing
    // Should have updated at ~0s, ~1s, ~2s, ~3s
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results.length).toBeLessThanOrEqual(6);
    timer.destroy();
    vi.unstubAllGlobals();
  });

  it("stops updating after endTime is set via restart", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    timer.onUpdate((s) => results.push(s));

    const start = mockNow();
    timer.start(start, null);
    advanceTime(3000); // 3 seconds running

    const beforeCount = results.length;

    // Now set endTime
    timer.start(start, mockNow());
    advanceTime(0);

    const afterCount = results.length;

    // Should have at least one more update (final with running=false)
    expect(afterCount).toBeGreaterThan(beforeCount);
    expect(results[results.length - 1].running).toBe(false);

    // After stopping, further time advance should produce no more updates
    const finalCount = results.length;
    advanceTime(5000);
    expect(results.length).toBe(finalCount);

    timer.destroy();
    vi.unstubAllGlobals();
  });

  it("getState returns current state", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    timer.start(mockNow(), null);
    advanceTime(2000);
    const state = timer.getState();
    expect(state.running).toBe(true);
    expect(state.formatted).toBe("00:02");
    timer.destroy();
    vi.unstubAllGlobals();
  });
});

// ── Cleanup ──────────────────────────────────────────

describe("cleanup", () => {
  it("destroy removes all listeners and stops animation", () => {
    const { createTimer, advanceTime, mockNow, mockCaf } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    const unsub = timer.onUpdate((s) => results.push(s));
    timer.start(mockNow(), null);
    advanceTime(0);

    const countBeforeDestroy = results.length;
    timer.destroy();
    advanceTime(5000);
    expect(results.length).toBe(countBeforeDestroy);
    vi.unstubAllGlobals();
  });

  it("stop pauses updates without clearing listeners", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    timer.onUpdate((s) => results.push(s));
    timer.start(mockNow(), null);
    advanceTime(1000);

    const beforeStop = results.length;
    timer.stop();
    advanceTime(5000);
    expect(results.length).toBe(beforeStop);
    vi.unstubAllGlobals();
  });

  it("unsubscribe removes individual listener", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results1: ToolTimerState[] = [];
    const results2: ToolTimerState[] = [];

    const unsub1 = timer.onUpdate((s) => results1.push(s));
    timer.onUpdate((s) => results2.push(s));

    timer.start(mockNow(), null);
    advanceTime(1000);

    expect(results1.length).toBeGreaterThan(0);
    expect(results2.length).toBeGreaterThan(0);

    unsub1();
    const before1 = results1.length;
    const before2 = results2.length;

    advanceTime(2000);
    expect(results1.length).toBe(before1); // Not updated
    expect(results2.length).toBeGreaterThan(before2); // Still updated

    timer.destroy();
    vi.unstubAllGlobals();
  });
});

// ── Edge Cases ───────────────────────────────────────

describe("edge cases", () => {
  it("handles start with endTime in the past gracefully", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    timer.onUpdate((s) => results.push(s));

    const now = mockNow();
    timer.start(now + 10000, now); // endTime before startTime
    advanceTime(0);

    expect(results[results.length - 1].running).toBe(false);
    // Elapsed should be 0 or negative but clamped
    expect(results[results.length - 1].formatted).toBe("00:00");
    timer.destroy();
    vi.unstubAllGlobals();
  });

  it("multiple start calls reset the timer", () => {
    const { createTimer, advanceTime, mockNow } = setup();
    const timer = createTimer();
    const results: ToolTimerState[] = [];
    timer.onUpdate((s) => results.push(s));

    timer.start(mockNow(), null);
    advanceTime(5000); // Run for 5 seconds

    expect(results[results.length - 1].formatted).toBe("00:05");

    // Reset timer
    const newStart = mockNow();
    timer.start(newStart, null);
    advanceTime(0); // Initial tick after reset

    // Should show fresh time
    const lastState = results[results.length - 1];
    expect(lastState.formatted).toBe("00:00");
    expect(lastState.running).toBe(true);

    timer.destroy();
    vi.unstubAllGlobals();
  });
});
