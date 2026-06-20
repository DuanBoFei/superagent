import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  renderPlaybackTimeline,
  createPlaybackTimelineController,
} from "../../packages/web/src/components/sidebar/PlaybackTimeline";
import type {
  PlaybackTimelineController,
  PlaybackTimelineOptions,
} from "../../packages/web/src/components/sidebar/PlaybackTimeline";
import { createSessionPlaybackSlice } from "../../packages/web/src/hooks/useSessionPlayback";
import type { SessionPlaybackSlice } from "../../packages/web/src/hooks/useSessionPlayback";

let jsdom: JSDOM;

function setupDOM(): HTMLElement {
  jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
  });

  globalThis.document = jsdom.window.document as unknown as Document;
  globalThis.window = jsdom.window as unknown as Window & typeof globalThis;
  globalThis.Event = jsdom.window.Event as unknown as typeof Event;
  globalThis.MouseEvent = jsdom.window.MouseEvent as unknown as typeof MouseEvent;
  globalThis.PointerEvent = jsdom.window.PointerEvent as unknown as typeof PointerEvent;
  globalThis.KeyboardEvent = jsdom.window.KeyboardEvent as unknown as typeof KeyboardEvent;

  const container = document.createElement("div");
  container.id = "test-container";
  document.body.appendChild(container);
  return container;
}

function cleanupDOM(): void {
  if (!jsdom) return;
  jsdom.window.close();
  jsdom = undefined!;
  delete (globalThis as Record<string, unknown>).document;
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).Event;
  delete (globalThis as Record<string, unknown>).MouseEvent;
  delete (globalThis as Record<string, unknown>).PointerEvent;
  delete (globalThis as Record<string, unknown>).KeyboardEvent;
}

function makeSlice(maxIndex = 20): SessionPlaybackSlice {
  const slice = createSessionPlaybackSlice();
  slice.setMaxIndex(maxIndex);
  return slice;
}

// ── Render tests ────────────────────────────────────────

describe("renderPlaybackTimeline", () => {
  it("renders a timeline container", () => {
    const slice = makeSlice();
    const html = renderPlaybackTimeline({ slice, currentIndex: 5 });
    expect(html).toContain("playback-timeline");
  });

  it("renders a track element with the progress fill", () => {
    const slice = makeSlice(20);
    const html = renderPlaybackTimeline({ slice, currentIndex: 10 });
    expect(html).toContain("playback-timeline-track");
    expect(html).toContain("playback-timeline-fill");
  });

  it("renders the scrubber handle at correct position", () => {
    const slice = makeSlice(20);
    const html = renderPlaybackTimeline({ slice, currentIndex: 10 });
    expect(html).toContain("playback-timeline-scrubber");
  });

  it("fill width CSS reflects current position as percentage", () => {
    const slice = makeSlice(20);
    const html = renderPlaybackTimeline({ slice, currentIndex: 10 });
    // 10 / 20 = 50%
    expect(html).toContain("50%");
  });

  it("shows 0% fill when at start", () => {
    const slice = makeSlice(20);
    const html = renderPlaybackTimeline({ slice, currentIndex: 0 });
    expect(html).toContain("0%");
  });

  it("shows 100% fill when at end", () => {
    const slice = makeSlice(10);
    const html = renderPlaybackTimeline({ slice, currentIndex: 10 });
    expect(html).toContain("100%");
  });

  it("renders tool call markers when provided", () => {
    const slice = makeSlice(20);
    const html = renderPlaybackTimeline({
      slice,
      currentIndex: 5,
      toolCallIndices: [3, 7, 12],
    });
    expect(html).toContain("playback-timeline-marker");
    // Should have 3 markers
    const markers = html.match(/playback-timeline-marker/g);
    expect(markers).toHaveLength(3);
  });

  it("renders no markers when toolCallIndices is empty", () => {
    const slice = makeSlice(20);
    const html = renderPlaybackTimeline({ slice, currentIndex: 5 });
    expect(html).not.toContain("playback-timeline-marker");
  });

  it("renders current index label", () => {
    const slice = makeSlice(20);
    const html = renderPlaybackTimeline({ slice, currentIndex: 7 });
    expect(html).toContain("7");
  });
});

// ── Controller tests ────────────────────────────────────

describe("PlaybackTimelineController", () => {
  let container: HTMLElement;
  let controller: PlaybackTimelineController;
  let slice: SessionPlaybackSlice;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: PlaybackTimelineOptions): HTMLElement {
    container = setupDOM();
    slice = options.slice;
    container.innerHTML = renderPlaybackTimeline(options);
    const el = container.querySelector<HTMLElement>(".playback-timeline")!;
    controller = createPlaybackTimelineController(el, options);
    controller.attach();
    return el;
  }

  function createMockPointerEvent(
    type: string,
    clientX: number,
    target: HTMLElement,
  ): PointerEvent {
    return new jsdom.window.PointerEvent(type, {
      bubbles: true,
      clientX,
      pointerId: 1,
      pointerType: "mouse",
    });
  }

  it("clicking on track calls jumpTo with calculated index", () => {
    const s = makeSlice(20);
    const spy = vi.spyOn(s, "jumpTo");
    const root = renderAndAttach({ slice: s, currentIndex: 5 });

    const track = root.querySelector<HTMLElement>(".playback-timeline-track")!;

    // Mock getBoundingClientRect to simulate track geometry
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
      left: 100,
      width: 200,
      right: 300,
      top: 0,
      bottom: 20,
      height: 20,
    } as DOMRect);

    // Click at clientX=200 → offset=100/200=50% → index=10
    track.dispatchEvent(new jsdom.window.MouseEvent("click", {
      bubbles: true,
      clientX: 200,
    }));

    expect(spy).toHaveBeenCalledWith(10);
  });

  it("clamps click position to 0-maxIndex bounds", () => {
    const s = makeSlice(10);
    const spy = vi.spyOn(s, "jumpTo");
    const root = renderAndAttach({ slice: s, currentIndex: 0 });

    const track = root.querySelector<HTMLElement>(".playback-timeline-track")!;
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 100,
      right: 100,
      top: 0,
      bottom: 20,
      height: 20,
    } as DOMRect);

    // Click at clientX=-50 (before track start) → should clamp to 0
    track.dispatchEvent(new jsdom.window.MouseEvent("click", {
      bubbles: true,
      clientX: -50,
    }));

    expect(spy).toHaveBeenCalledWith(0);
  });

  it("calls onStateChange after jump", () => {
    const s = makeSlice(20);
    const onChange = vi.fn();
    const root = renderAndAttach({ slice: s, currentIndex: 5, onStateChange: onChange });

    const track = root.querySelector<HTMLElement>(".playback-timeline-track")!;
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 200,
      right: 200,
      top: 0,
      bottom: 20,
      height: 20,
    } as DOMRect);

    track.dispatchEvent(new jsdom.window.MouseEvent("click", {
      bubbles: true,
      clientX: 100,
    }));

    expect(onChange).toHaveBeenCalled();
  });

  it("detach removes event listeners", () => {
    const s = makeSlice(20);
    const spy = vi.spyOn(s, "jumpTo");
    const root = renderAndAttach({ slice: s, currentIndex: 5 });

    controller.detach();

    const track = root.querySelector<HTMLElement>(".playback-timeline-track")!;
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 200,
      right: 200,
      top: 0,
      bottom: 20,
      height: 20,
    } as DOMRect);

    track.dispatchEvent(new jsdom.window.MouseEvent("click", {
      bubbles: true,
      clientX: 100,
    }));

    expect(spy).not.toHaveBeenCalled();
  });
});
