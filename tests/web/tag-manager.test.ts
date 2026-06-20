import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  renderTagManager,
  createTagManagerController,
} from "../../packages/web/src/components/sidebar/TagManager";
import type {
  TagManagerController,
  TagManagerOptions,
} from "../../packages/web/src/components/sidebar/TagManager";

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
  document.body.innerHTML = "";
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

// ── Render tests ──────────────────────────────────────

describe("renderTagManager", () => {
  it("renders a tag manager container", () => {
    const html = renderTagManager({ tags: ["bugfix", "auth"] });
    expect(html).toContain("tag-manager");
  });

  it("renders empty state when tags array is empty", () => {
    const html = renderTagManager({ tags: [] });
    expect(html).toContain("tag-manager--empty");
    expect(html).toContain("Add tags to organize sessions");
  });

  it("renders tag input field with placeholder", () => {
    const html = renderTagManager({ tags: [] });
    expect(html).toContain('placeholder="Add tag..."');
    expect(html).toContain('type="text"');
  });

  it("renders all existing tags as chips", () => {
    const html = renderTagManager({ tags: ["bugfix", "auth", "frontend"] });
    expect(html).toContain("bugfix");
    expect(html).toContain("auth");
    expect(html).toContain("frontend");
  });

  it("renders a remove button (×) on each tag chip", () => {
    const html = renderTagManager({ tags: ["bugfix"] });
    expect(html).toContain('data-action="remove-tag"');
    expect(html).toContain("&times;");
  });

  it("assigns color class to each tag chip", () => {
    const html = renderTagManager({ tags: ["bugfix", "auth"] });
    expect(html).toContain("tag-color-");
  });

  it("gives same tag the same color (deterministic hash)", () => {
    const html1 = renderTagManager({ tags: ["bugfix"] });
    const html2 = renderTagManager({ tags: ["bugfix"] });
    // Extract color class from both renders
    const m1 = html1.match(/tag-color-(\d+)/);
    const m2 = html2.match(/tag-color-(\d+)/);
    expect(m1).not.toBeNull();
    expect(m2).not.toBeNull();
    expect(m1![1]).toBe(m2![1]);
  });

  it("gives different tags different colors", () => {
    const html = renderTagManager({ tags: ["bugfix", "auth", "frontend"] });
    const colors = html.match(/tag-color-(\d+)/g);
    expect(colors).not.toBeNull();
    const unique = new Set(colors);
    // Most tags should have unique colors (hash collision possible but unlikely with 3 items)
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it("sets data-tag attribute on each chip", () => {
    const html = renderTagManager({ tags: ["bugfix"] });
    expect(html).toContain('data-tag="bugfix"');
  });

  it("escapes HTML in tag names", () => {
    const html = renderTagManager({ tags: ['<script>alert("xss")</script>'] });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("does not show empty state when tags exist", () => {
    const html = renderTagManager({ tags: ["bugfix"] });
    expect(html).not.toContain("tag-manager--empty");
    expect(html).not.toContain("Add tags to organize sessions");
  });

  it("sets aria-label on tag input", () => {
    const html = renderTagManager({ tags: [] });
    expect(html).toContain('aria-label="Add tag"');
  });

  it("sets aria-label on tag chips", () => {
    const html = renderTagManager({ tags: ["bugfix"] });
    expect(html).toContain('aria-label="Remove tag bugfix"');
  });
});

// ── Controller tests ─────────────────────────────────

describe("TagManagerController", () => {
  let container: HTMLElement;
  let controller: TagManagerController;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(options: TagManagerOptions): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderTagManager(options);
    const el = container.querySelector<HTMLElement>(".tag-manager")!;
    controller = createTagManagerController(el, options);
    controller.attach();
    return el;
  }

  it("calls onAddTag when Enter is pressed in input", () => {
    const onAddTag = vi.fn();
    renderAndAttach({ tags: [], onAddTag });

    const input = container.querySelector<HTMLInputElement>(
      'input[type="text"]',
    )!;
    input.value = "bugfix";
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(onAddTag).toHaveBeenCalledWith("bugfix");
  });

  it("trims whitespace from tag input", () => {
    const onAddTag = vi.fn();
    renderAndAttach({ tags: [], onAddTag });

    const input = container.querySelector<HTMLInputElement>(
      'input[type="text"]',
    )!;
    input.value = "  bugfix  ";
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(onAddTag).toHaveBeenCalledWith("bugfix");
  });

  it("does not call onAddTag for empty input", () => {
    const onAddTag = vi.fn();
    renderAndAttach({ tags: [], onAddTag });

    const input = container.querySelector<HTMLInputElement>(
      'input[type="text"]',
    )!;
    input.value = "   ";
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(onAddTag).not.toHaveBeenCalled();
  });

  it("does not call onAddTag for duplicate tag already in list", () => {
    const onAddTag = vi.fn();
    renderAndAttach({ tags: ["bugfix"], onAddTag });

    const input = container.querySelector<HTMLInputElement>(
      'input[type="text"]',
    )!;
    input.value = "bugfix";
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(onAddTag).not.toHaveBeenCalled();
  });

  it("clears input after successful add", () => {
    const onAddTag = vi.fn();
    renderAndAttach({ tags: [], onAddTag });

    const input = container.querySelector<HTMLInputElement>(
      'input[type="text"]',
    )!;
    input.value = "bugfix";
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(input.value).toBe("");
  });

  it("calls onRemoveTag when × button clicked", () => {
    const onRemoveTag = vi.fn();
    renderAndAttach({ tags: ["bugfix", "auth"], onRemoveTag });

    const removeBtn = container.querySelector<HTMLElement>(
      '[data-tag="bugfix"] [data-action="remove-tag"]',
    )!;
    removeBtn.click();

    expect(onRemoveTag).toHaveBeenCalledWith("bugfix");
  });

  it("calls onTagClick when tag chip clicked", () => {
    const onTagClick = vi.fn();
    renderAndAttach({ tags: ["bugfix"], onTagClick });

    const chip = container.querySelector<HTMLElement>('[data-tag="bugfix"]')!;
    chip.click();

    expect(onTagClick).toHaveBeenCalledWith("bugfix");
  });

  it("does not trigger onRemoveTag when clicking on the chip body", () => {
    // Clicking the chip itself (not the × button) should trigger onTagClick, not onRemoveTag
    const onTagClick = vi.fn();
    const onRemoveTag = vi.fn();
    renderAndAttach({ tags: ["bugfix"], onTagClick, onRemoveTag });

    const chip = container.querySelector<HTMLElement>('[data-tag="bugfix"]')!;
    chip.click();

    expect(onTagClick).toHaveBeenCalledWith("bugfix");
    expect(onRemoveTag).not.toHaveBeenCalled();
  });

  it("detach removes event listeners", () => {
    const onAddTag = vi.fn();
    const onTagClick = vi.fn();
    renderAndAttach({ tags: ["bugfix"], onAddTag, onTagClick });

    controller.detach();

    const input = container.querySelector<HTMLInputElement>(
      'input[type="text"]',
    )!;
    input.value = "newtag";
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    const chip = container.querySelector<HTMLElement>('[data-tag="bugfix"]')!;
    chip.click();

    expect(onAddTag).not.toHaveBeenCalled();
    expect(onTagClick).not.toHaveBeenCalled();
  });

  it("focus method focuses the input", () => {
    renderAndAttach({ tags: [] });

    controller.focus();

    const input = container.querySelector<HTMLInputElement>(
      'input[type="text"]',
    )!;
    expect(document.activeElement).toBe(input);
  });
});
