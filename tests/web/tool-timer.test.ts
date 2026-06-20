import { describe, expect, it } from "vitest";
import { renderToolTimer } from "../../packages/web/src/components/chat/tool-grid/ToolTimer";
import type { ToolTimerState } from "../../packages/web/src/hooks/use-tool-timer";

// ── Helpers ──────────────────────────────────────────

function render(overrides: Partial<ToolTimerState> = {}): string {
  return renderToolTimer({
    formatted: overrides.formatted ?? "00:00",
    running: overrides.running ?? true,
    elapsedMs: overrides.elapsedMs ?? 0,
  });
}

// ── Display ──────────────────────────────────────────

describe("display", () => {
  it("renders formatted time text", () => {
    const html = render({ formatted: "01:23" });
    expect(html).toContain("01:23");
  });

  it("renders 00:00 for zero elapsed", () => {
    const html = render({ formatted: "00:00", elapsedMs: 0 });
    expect(html).toContain("00:00");
  });

  it("renders large minute values correctly", () => {
    const html = render({ formatted: "125:45" });
    expect(html).toContain("125:45");
  });
});

// ── Running Indicator ────────────────────────────────

describe("running indicator", () => {
  it("includes tool-timer-running class when running", () => {
    const html = render({ running: true });
    expect(html).toContain("tool-timer-running");
  });

  it("omits tool-timer-running class when stopped", () => {
    const html = render({ running: false });
    expect(html).not.toContain("tool-timer-running");
  });

  it("running class is present for active timer with elapsed time", () => {
    const html = render({ running: true, formatted: "05:32" });
    expect(html).toContain("tool-timer-running");
    expect(html).toContain("05:32");
  });

  it("no running class for completed timer with fixed duration", () => {
    const html = render({ running: false, formatted: "03:15" });
    expect(html).toContain("03:15");
    expect(html).not.toContain("tool-timer-running");
  });
});

// ── ARIA ─────────────────────────────────────────────

describe("ARIA attributes", () => {
  it("includes role=timer", () => {
    const html = render();
    expect(html).toContain('role="timer"');
  });

  it("includes aria-label with elapsed time", () => {
    const html = render({ formatted: "02:30" });
    expect(html).toContain('aria-label="Elapsed time: 02:30"');
  });
});

// ── CSS Classes ──────────────────────────────────────

describe("CSS classes", () => {
  it("includes tool-timer wrapper class", () => {
    const html = render();
    expect(html).toContain("class=\"tool-timer");
  });

  it("includes monospace and tabular-nums classes for time text", () => {
    const html = render();
    expect(html).toContain("font-mono");
    expect(html).toContain("tabular-nums");
  });

  it("includes neutral text color", () => {
    const html = render();
    expect(html).toContain("text-neutral-400");
  });
});

// ── Edge Cases ───────────────────────────────────────

describe("edge cases", () => {
  it("renders without crashing for all running/stopped combinations", () => {
    const combinations: Partial<ToolTimerState>[] = [
      { running: true, formatted: "00:00" },
      { running: true, formatted: "59:59" },
      { running: false, formatted: "00:00" },
      { running: false, formatted: "99:59" },
    ];
    for (const combo of combinations) {
      const html = render(combo);
      expect(html).toBeTruthy();
      expect(typeof html).toBe("string");
    }
  });

  it("always produces non-empty string output", () => {
    const html = render();
    expect(html.length).toBeGreaterThan(0);
  });
});
