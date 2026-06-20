// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  renderTagManager,
  createTagManagerController,
  type TagManagerOptions,
} from "../../packages/web/src/components/sidebar/TagManager";

// Helper: render into DOM and return container
function setupDOM(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

// ── renderTagManager ─────────────────────────────────

describe("renderTagManager", () => {
  it("renders input and empty state when tags is empty", () => {
    const html = renderTagManager({ tags: [] });
    expect(html).toContain("tag-manager-input");
    expect(html).toContain("tag-manager--empty");
    expect(html).toContain("Add tags to organize sessions");
    expect(html).not.toContain("tag-chip");
  });

  it("renders chips for each tag", () => {
    const html = renderTagManager({ tags: ["bug", "feature"] });
    expect(html).toContain("bug");
    expect(html).toContain("feature");
    expect(html).not.toContain("tag-manager--empty");
    expect(html).not.toContain("Add tags to organize sessions");
  });

  it("renders tag chips with data-tag attributes", () => {
    const html = renderTagManager({ tags: ["urgent"] });
    expect(html).toContain('data-tag="urgent"');
    expect(html).toContain("tag-chip");
  });

  it("renders remove buttons on each chip", () => {
    const html = renderTagManager({ tags: ["tag1", "tag2"] });
    expect(html).toContain('data-action="remove-tag"');
    const removeCount = (html.match(/data-action="remove-tag"/g) || []).length;
    expect(removeCount).toBe(2);
  });

  it("assigns consistent color classes via hash", () => {
    const html1 = renderTagManager({ tags: ["typescript"] });
    const html2 = renderTagManager({ tags: ["typescript"] });
    // Same tag should yield same color index
    const idx1 = html1.match(/tag-color-(\d+)/)?.[1];
    const idx2 = html2.match(/tag-color-(\d+)/)?.[1];
    expect(idx1).toBe(idx2);
  });

  it("escapes HTML entities in tag names", () => {
    const html = renderTagManager({ tags: ['<script>alert("xss")</script>'] });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;/script&gt;");
  });

  it("renders placeholder text in input", () => {
    const html = renderTagManager({ tags: [] });
    expect(html).toContain('placeholder="Add tag..."');
  });

  it("sets aria-label on tag chips for accessibility", () => {
    const html = renderTagManager({ tags: ["test"] });
    expect(html).toContain('aria-label="Remove tag test"');
  });
});

// ── createTagManagerController ───────────────────────

describe("createTagManagerController", () => {
  let el: HTMLElement;
  let callbacks: {
    onAddTag: ReturnType<typeof vi.fn>;
    onRemoveTag: ReturnType<typeof vi.fn>;
    onTagClick: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    callbacks = {
      onAddTag: vi.fn(),
      onRemoveTag: vi.fn(),
      onTagClick: vi.fn(),
    };
    const html = renderTagManager({
      tags: ["bug", "feature"],
      ...callbacks,
    });
    el = setupDOM(html);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("calls onAddTag when user types tag and presses Enter", () => {
    const ctrl = createTagManagerController(el, {
      tags: ["bug", "feature"],
      ...callbacks,
    });
    ctrl.attach();

    const input = el.querySelector("input")!;
    input.value = "urgent";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(callbacks.onAddTag).toHaveBeenCalledWith("urgent");
    ctrl.detach();
  });

  it("does not call onAddTag for empty input", () => {
    const ctrl = createTagManagerController(el, {
      tags: ["bug", "feature"],
      ...callbacks,
    });
    ctrl.attach();

    const input = el.querySelector("input")!;
    input.value = "   ";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(callbacks.onAddTag).not.toHaveBeenCalled();
    ctrl.detach();
  });

  it("does not call onAddTag for duplicate tag", () => {
    const ctrl = createTagManagerController(el, {
      tags: ["bug", "feature"],
      ...callbacks,
    });
    ctrl.attach();

    const input = el.querySelector("input")!;
    input.value = "bug";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(callbacks.onAddTag).not.toHaveBeenCalled();
    ctrl.detach();
  });

  it("clears input after successful add", () => {
    const ctrl = createTagManagerController(el, {
      tags: ["bug"],
      ...callbacks,
    });
    ctrl.attach();

    const input = el.querySelector("input")!;
    input.value = "new-tag";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(input.value).toBe("");
    ctrl.detach();
  });

  it("ignores non-Enter keydown events", () => {
    const ctrl = createTagManagerController(el, {
      tags: ["bug"],
      ...callbacks,
    });
    ctrl.attach();

    const input = el.querySelector("input")!;
    input.value = "some-tag";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    expect(callbacks.onAddTag).not.toHaveBeenCalled();
    ctrl.detach();
  });

  it("calls onRemoveTag when remove button is clicked", () => {
    const ctrl = createTagManagerController(el, {
      tags: ["bug", "feature"],
      ...callbacks,
    });
    ctrl.attach();

    const removeBtn = el.querySelector(
      '[data-action="remove-tag"]',
    ) as HTMLElement;
    removeBtn.click();

    expect(callbacks.onRemoveTag).toHaveBeenCalledWith("bug");
    ctrl.detach();
  });

  it("calls onTagClick when tag chip text is clicked", () => {
    const ctrl = createTagManagerController(el, {
      tags: ["bug", "feature"],
      ...callbacks,
    });
    ctrl.attach();

    const chip = el.querySelector("[data-tag]") as HTMLElement;
    chip.click();

    expect(callbacks.onTagClick).toHaveBeenCalledWith("bug");
    ctrl.detach();
  });

  it("returns focus method", () => {
    const ctrl = createTagManagerController(el, {
      tags: ["bug"],
      ...callbacks,
    });
    ctrl.attach();

    const input = el.querySelector("input")!;
    const focusSpy = vi.spyOn(input, "focus");
    ctrl.focus();
    expect(focusSpy).toHaveBeenCalled();
    ctrl.detach();
  });

  it("detaches without errors even when called twice", () => {
    const ctrl = createTagManagerController(el, {
      tags: ["tag"],
      ...callbacks,
    });
    ctrl.attach();
    ctrl.detach();
    // Should not throw
    ctrl.detach();
  });
});
