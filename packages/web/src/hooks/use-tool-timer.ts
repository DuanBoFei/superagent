export interface ToolTimerState {
  formatted: string;
  running: boolean;
  elapsedMs: number;
}

export interface ToolTimerController {
  start(startTime: number, endTime: number | null): void;
  stop(): void;
  getState(): ToolTimerState;
  onUpdate(callback: (state: ToolTimerState) => void): () => void;
  destroy(): void;
}

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function createToolTimer(): ToolTimerController {
  let listeners: Array<(state: ToolTimerState) => void> = [];
  let rafId: number | null = null;
  let startTimestamp: number = 0;
  let endTimestamp: number | null = null;
  let lastSecond = -1;
  let currentState: ToolTimerState = { formatted: "00:00", running: false, elapsedMs: 0 };

  function computeState(): ToolTimerState {
    if (endTimestamp !== null) {
      const elapsedMs = Math.max(0, endTimestamp - startTimestamp);
      const totalSeconds = Math.floor(elapsedMs / 1000);
      return {
        formatted: formatTime(totalSeconds),
        running: false,
        elapsedMs,
      };
    }
    const elapsedMs = Date.now() - startTimestamp;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    return {
      formatted: formatTime(totalSeconds),
      running: true,
      elapsedMs,
    };
  }

  function notify(): void {
    for (const cb of listeners) {
      cb(currentState);
    }
  }

  function tick(): void {
    const now = Date.now();

    if (endTimestamp !== null) {
      currentState = computeState();
      notify();
      stopRaf();
      return;
    }

    const elapsedMs = now - startTimestamp;
    const currentSecond = Math.floor(elapsedMs / 1000);

    if (currentSecond !== lastSecond) {
      lastSecond = currentSecond;
      currentState = computeState();
      notify();
    }

    rafId = requestAnimationFrame(tick);
  }

  function stopRaf(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return {
    start(startTime: number, endTime: number | null): void {
      stopRaf();
      startTimestamp = startTime;
      endTimestamp = endTime;
      lastSecond = -1;
      rafId = requestAnimationFrame(tick);
    },

    stop(): void {
      stopRaf();
    },

    getState(): ToolTimerState {
      return currentState;
    },

    onUpdate(callback: (state: ToolTimerState) => void): () => void {
      listeners.push(callback);
      return () => {
        listeners = listeners.filter((cb) => cb !== callback);
      };
    },

    destroy(): void {
      stopRaf();
      listeners = [];
    },
  };
}
