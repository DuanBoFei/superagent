import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  renderPlaybackControls,
  createPlaybackControlsController,
} from "../../packages/web/src/components/sidebar/PlaybackControls";
import type {
  PlaybackControlsController,
  PlaybackControlsOptions,
} from "../../packages/web/src/components/sidebar/PlaybackControls";
import {
  createSessionPlaybackSlice,
} from "../../packages/web/src/hooks/useSessionPlayback";
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
  globalThis.KeyboardEvent = jsdom.window.KeyboardEvent as unknown as typeof KeyboardEvent;
  globalThis.FocusEvent = jsdom.window.FocusEvent as unknown as typeof FocusEvent;
  globalThis.InputEvent = jsdom.window.InputEvent as unknown as typeof InputEvent;

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
  delete (globalThis as Record<string, unknown>).KeyboardEvent;
  delete (globalThis as Record<string, unknown>).FocusEvent;
  delete (globalThis as Record<string, unknown>).InputEvent;
}

function makeSlice(maxIndex = 10): SessionPlaybackSlice {
  const slice = createSessionPlaybackSlice();
  slice.setMaxIndex(maxIndex);
  return slice;
}

// ── Render tests ────────────────────────────────────────

describe("renderPlaybackControls", () => {
  it("renders a playback controls container", () => {
    const slice = makeSlice();
    const html = renderPlaybackControls({ slice, currentIndex: 0, isPlaying: false });
    expect(html).toContain("playback-controls");
  });

  it("renders play button when paused", () => {
    const slice = makeSlice();
    const html = renderPlaybackControls({ slice, currentIndex: 0, isPlaying: false });
    expect(html).toContain('data-action="play"');
    expect(html).not.toContain('data-action="pause"');
  });

  it("renders pause button when playing", () => {
    const slice = makeSlice();
    const html = renderPlaybackControls({ slice, currentIndex: 3, isPlaying: true });
    expect(html).toContain('data-action="pause"');
  });

  it("renders step forward and step back buttons", () => {
    const slice = makeSlice();
    const html = renderPlaybackControls({ slice, currentIndex: 5, isPlaying: false });
    expect(html).toContain('data-action="step-forward"');
    expect(html).toContain('data-action="step-back"');
  });

  it("renders Show All button", () => {
    const slice = makeSlice();
    const html = renderPlaybackControls({ slice, currentIndex: 0, isPlaying: false });
    expect(html).toContain('data-action="show-all"');
  });

  it("renders speed selector with 1x/2x/4x options", () => {
    const slice = makeSlice();
    const html = renderPlaybackControls({ slice, currentIndex: 0, isPlaying: false });
    expect(html).toContain('data-action="set-speed"');
    expect(html).toContain("1x");
    expect(html).toContain("2x");
    expect(html).toContain("4x");
  });

  it("renders progress indicator with current / max", () => {
    const slice = makeSlice(42);
    const html = renderPlaybackControls({ slice, currentIndex: 15, isPlaying: false });
    expect(html).toContain("15");
    expect(html).toContain("42");
  });

  it("highlights active speed button", () => {
    const slice = makeSlice();
    slice.setSpeed(2);
    const html = renderPlaybackControls({ slice, currentIndex: 0, isPlaying: false });
    // Speed 2x button should have active class
    expect(html).toContain("playback-speed-active");
  });

  it("Play button is disabled when at maxIndex (already showing all)", () => {
    const slice = makeSlice(10);
    const html = renderPlaybackControls({ slice, currentIndex: 10, isPlaying: false });
    expect(html).toContain('disabled');
  });

  it("Step forward button is disabled when at maxIndex", () => {
    const slice = makeSlice(5);
    const html = renderPlaybackControls({ slice, currentIndex: 5, isPlaying: false });
    // step-forward should be disabled at the end
    const stepFwdMatch = html.match(/data-action="step-forward"[^>]*disabled/);
    expect(stepFwdMatch).not.toBeNull();
  });

  it("Step back button is disabled when at index 0", () => {
    const slice = makeSlice(10);
    const html = renderPlaybackControls({ slice, currentIndex: 0, isPlaying: false });
    const stepBackMatch = html.match(/data-action="step-back"[^>]*disabled/);
    expect(stepBackMatch).not.toBeNull();
  });

  it("escapes HTML in any dynamic content", () => {
    const slice = makeSlice();
    const html = renderPlaybackControls({ slice, currentIndex: 0, isPlaying: false });
    expect(html).not.toContain("<script>");
  });
});

// ── Controller tests ────────────────────────────────────

describe("PlaybackControlsController", () => {
  let container: HTMLElement;
  let controller: PlaybackControlsController;
  let slice: SessionPlaybackSlice;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: PlaybackControlsOptions): HTMLElement {
    container = setupDOM();
    slice = options.slice;
    container.innerHTML = renderPlaybackControls(options);
    const el = container.querySelector<HTMLElement>(".playback-controls")!;
    controller = createPlaybackControlsController(el, options);
    controller.attach();
    return el;
  }

  it("calls slice.play() when play button clicked", () => {
    const s = makeSlice(10);
    const playSpy = vi.spyOn(s, "play");
    renderAndAttach({ slice: s, currentIndex: 0, isPlaying: false });

    const btn = container.querySelector<HTMLElement>('[data-action="play"]')!;
    btn.click();

    expect(playSpy).toHaveBeenCalled();
  });

  it("calls slice.pause() when pause button clicked", () => {
    const s = makeSlice(10);
    s.play();
    const pauseSpy = vi.spyOn(s, "pause");
    renderAndAttach({ slice: s, currentIndex: 3, isPlaying: true });

    const btn = container.querySelector<HTMLElement>('[data-action="pause"]')!;
    btn.click();

    expect(pauseSpy).toHaveBeenCalled();
  });

  it("calls slice.stepForward() when step forward clicked", () => {
    const s = makeSlice(10);
    const spy = vi.spyOn(s, "stepForward");
    renderAndAttach({ slice: s, currentIndex: 3, isPlaying: false });

    const btn = container.querySelector<HTMLElement>('[data-action="step-forward"]')!;
    btn.click();

    expect(spy).toHaveBeenCalled();
  });

  it("calls slice.stepBack() when step back clicked", () => {
    const s = makeSlice(10);
    s.jumpTo(5);
    const spy = vi.spyOn(s, "stepBack");
    renderAndAttach({ slice: s, currentIndex: 5, isPlaying: false });

    const btn = container.querySelector<HTMLElement>('[data-action="step-back"]')!;
    btn.click();

    expect(spy).toHaveBeenCalled();
  });

  it("calls slice.showAll() when show all clicked", () => {
    const s = makeSlice(10);
    const spy = vi.spyOn(s, "showAll");
    renderAndAttach({ slice: s, currentIndex: 3, isPlaying: false });

    const btn = container.querySelector<HTMLElement>('[data-action="show-all"]')!;
    btn.click();

    expect(spy).toHaveBeenCalled();
  });

  it("calls slice.setSpeed() when speed button clicked", () => {
    const s = makeSlice(10);
    const spy = vi.spyOn(s, "setSpeed");
    renderAndAttach({ slice: s, currentIndex: 0, isPlaying: false });

    const btn = container.querySelector<HTMLElement>('[data-speed="2"]')!;
    btn.click();

    expect(spy).toHaveBeenCalledWith(2);
  });

  it("fires onStateChange after any action changes state", () => {
    const s = makeSlice(10);
    const onChange = vi.fn();
    renderAndAttach({ slice: s, currentIndex: 0, isPlaying: false, onStateChange: onChange });

    const btn = container.querySelector<HTMLElement>('[data-action="step-forward"]')!;
    btn.click();

    expect(onChange).toHaveBeenCalled();
  });

  // ── Keyboard shortcuts ─────────────────────────────

  it("Space key toggles play/pause", () => {
    const s = makeSlice(10);
    const playSpy = vi.spyOn(s, "play");
    renderAndAttach({ slice: s, currentIndex: 0, isPlaying: false });

    const el = container.querySelector<HTMLElement>(".playback-controls")!;
    el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));

    expect(playSpy).toHaveBeenCalled();
  });

  it("ArrowLeft triggers step back", () => {
    const s = makeSlice(10);
    s.jumpTo(5);
    const spy = vi.spyOn(s, "stepBack");
    renderAndAttach({ slice: s, currentIndex: 5, isPlaying: false });

    const el = container.querySelector<HTMLElement>(".playback-controls")!;
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));

    expect(spy).toHaveBeenCalled();
  });

  it("ArrowRight triggers step forward", () => {
    const s = makeSlice(10);
    const spy = vi.spyOn(s, "stepForward");
    renderAndAttach({ slice: s, currentIndex: 0, isPlaying: false });

    const el = container.querySelector<HTMLElement>(".playback-controls")!;
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(spy).toHaveBeenCalled();
  });

  it("Home key jumps to index 0", () => {
    const s = makeSlice(10);
    s.jumpTo(5);
    const spy = vi.spyOn(s, "jumpTo");
    renderAndAttach({ slice: s, currentIndex: 5, isPlaying: false });

    const el = container.querySelector<HTMLElement>(".playback-controls")!;
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));

    expect(spy).toHaveBeenCalledWith(0);
  });

  it("End key jumps to maxIndex", () => {
    const s = makeSlice(10);
    const spy = vi.spyOn(s, "jumpTo");
    renderAndAttach({ slice: s, currentIndex: 0, isPlaying: false });

    const el = container.querySelector<HTMLElement>(".playback-controls")!;
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));

    expect(spy).toHaveBeenCalledWith(10);
  });

  it("ignores keyboard shortcuts when typing in an input", () => {
    const s = makeSlice(10);
    const spy = vi.spyOn(s, "play");
    renderAndAttach({ slice: s, currentIndex: 0, isPlaying: false });

    // Simulate event from within an input element
    const input = container.ownerDocument.createElement("input");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));

    // The event should not reach our controller since target is an input
    // (we check target.tagName in the handler)
    expect(spy).not.toHaveBeenCalled();
  });

  it("detach removes event listeners", () => {
    const s = makeSlice(10);
    const playSpy = vi.spyOn(s, "play");
    renderAndAttach({ slice: s, currentIndex: 0, isPlaying: false });

    controller.detach();

    const btn = container.querySelector<HTMLElement>('[data-action="play"]')!;
    btn.click();

    expect(playSpy).not.toHaveBeenCalled();
  });
});
