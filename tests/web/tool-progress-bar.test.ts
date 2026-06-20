import { describe, expect, it } from "vitest";
import { renderToolProgressBar } from "../../packages/web/src/components/chat/tool-grid/ToolProgressBar";
import type { ToolStatus } from "../../packages/web/src/types/tool-grid";

// ── Helpers ──────────────────────────────────────────

function render(overrides: { progress?: number | null; status?: ToolStatus } = {}) {
  return renderToolProgressBar({
    progress: "progress" in overrides ? overrides.progress : 0,
    status: overrides.status ?? "running",
  });
}

// ── Determinate mode ─────────────────────────────────

describe("determinate mode (progress 0-100)", () => {
  it("renders 0% width for progress 0", () => {
    const html = render({ progress: 0 });
    expect(html).toContain("width: 0%");
  });

  it("renders 50% width for progress 50", () => {
    const html = render({ progress: 50 });
    expect(html).toContain("width: 50%");
  });

  it("renders 100% width for progress 100", () => {
    const html = render({ progress: 100 });
    expect(html).toContain("width: 100%");
  });

  it("clamps progress to 0-100 range", () => {
    // Below 0 → treats as 0
    const low = render({ progress: -5 });
    expect(low).toContain("width: 0%");
    // Above 100 → treats as 100
    const high = render({ progress: 150 });
    expect(high).toContain("width: 100%");
  });

  it("renders role=progressbar with correct aria attributes", () => {
    const html = render({ progress: 42 });
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="42"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain("aria-label=");
  });
});

// ── Indeterminate mode ───────────────────────────────

describe("indeterminate mode (progress = null)", () => {
  it("uses indeterminate CSS class when progress is null", () => {
    const html = render({ progress: null });
    expect(html).toContain("tool-progress-indeterminate");
  });

  it("omits width percentage from fill bar", () => {
    const html = render({ progress: null });
    expect(html).not.toContain("width:");
  });

  it("sets aria-valuenow to empty string for indeterminate", () => {
    const html = render({ progress: null });
    expect(html).toContain('aria-valuenow=""');
  });
});

// ── Status colors ────────────────────────────────────

describe("status colors", () => {
  it("uses blue accent for running", () => {
    const html = render({ status: "running", progress: 60 });
    expect(html).toContain("tool-progress-running");
  });

  it("uses green accent for success", () => {
    const html = render({ status: "success", progress: 100 });
    expect(html).toContain("tool-progress-success");
  });

  it("uses red accent for failed", () => {
    const html = render({ status: "failed", progress: 30 });
    expect(html).toContain("tool-progress-failed");
  });

  it("uses neutral accent for cancelled", () => {
    const html = render({ status: "cancelled", progress: 45 });
    expect(html).toContain("tool-progress-cancelled");
  });

  it("uses neutral accent for pending", () => {
    const html = render({ status: "pending", progress: 0 });
    expect(html).toContain("tool-progress-pending");
  });
});

// ── Edge cases ───────────────────────────────────────

describe("edge cases", () => {
  it("renders without crashing for all status values", () => {
    const statuses: ToolStatus[] = ["pending", "running", "success", "failed", "cancelled"];
    for (const status of statuses) {
      const html = render({ status, progress: 50 });
      expect(html).toBeTruthy();
      expect(typeof html).toBe("string");
    }
  });

  it("always renders a track + fill bar structure", () => {
    const html = render({ progress: 50 });
    expect(html).toContain("tool-progress-track");
    expect(html).toContain("tool-progress-fill");
  });
});
