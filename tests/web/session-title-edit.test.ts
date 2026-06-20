// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  renderTitleEdit,
  createTitleEditController,
  buildDefaultTitle,
} from "../../packages/web/src/components/sidebar/TitleEdit";

function setupDOM(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

// ── buildDefaultTitle ──────────────────────────────────

describe("buildDefaultTitle", () => {
  it("returns the title when non-empty", () => {
    expect(buildDefaultTitle("My Session")).toBe("My Session");
  });

  it("returns 'Untitled Session' for empty string", () => {
    expect(buildDefaultTitle("")).toBe("Untitled Session");
  });

  it("returns 'Untitled Session' for whitespace-only", () => {
    expect(buildDefaultTitle("   ")).toBe("Untitled Session");
  });

  it("trims whitespace", () => {
    expect(buildDefaultTitle("  hello  ")).toBe("hello");
  });
});

// ── renderTitleEdit ────────────────────────────────────

describe("renderTitleEdit", () => {
  it("renders the display span with the title", () => {
    const html = renderTitleEdit("My Session");
    expect(html).toContain("My Session");
    expect(html).toContain("title-edit-display");
    expect(html).toContain('data-action="title-edit-start"');
  });

  it("renders hidden input with the title value", () => {
    const html = renderTitleEdit("Test");
    expect(html).toContain("title-edit-input");
    expect(html).toContain('value="Test"');
    expect(html).toContain("hidden");
  });

  it("renders status span", () => {
    const html = renderTitleEdit("Test");
    expect(html).toContain("title-edit-status");
  });

  it("renders 'Untitled Session' for empty title", () => {
    const html = renderTitleEdit("");
    expect(html).toContain("Untitled Session");
  });

  it("escapes HTML in title", () => {
    const html = renderTitleEdit('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ── createTitleEditController ──────────────────────────

describe("createTitleEditController", () => {
  let el: HTMLElement;
  let callbacks: {
    onSave: ReturnType<typeof vi.fn>;
    onCancel: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    callbacks = {
      onSave: vi.fn(),
      onCancel: vi.fn(),
    };
    const html = renderTitleEdit("Original Title");
    el = setupDOM(html);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("enters edit mode on display click", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();

    const display = el.querySelector(".title-edit-display") as HTMLElement;
    const input = el.querySelector(".title-edit-input") as HTMLInputElement;

    expect(display.classList.contains("hidden")).toBe(false);
    expect(input.classList.contains("hidden")).toBe(true);

    display.click();

    expect(display.classList.contains("hidden")).toBe(true);
    expect(input.classList.contains("hidden")).toBe(false);

    ctrl.detach();
  });

  it("enters edit mode on display Enter key", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();

    const display = el.querySelector(".title-edit-display") as HTMLElement;
    display.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    const input = el.querySelector(".title-edit-input") as HTMLInputElement;
    expect(input.classList.contains("hidden")).toBe(false);

    ctrl.detach();
  });

  it("enters edit mode on display Space key", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();

    const display = el.querySelector(".title-edit-display") as HTMLElement;
    display.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));

    const input = el.querySelector(".title-edit-input") as HTMLInputElement;
    expect(input.classList.contains("hidden")).toBe(false);

    ctrl.detach();
  });

  it("does not enter edit mode on other keys", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();

    const display = el.querySelector(".title-edit-display") as HTMLElement;
    display.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));

    const input = el.querySelector(".title-edit-input") as HTMLInputElement;
    expect(input.classList.contains("hidden")).toBe(true);

    ctrl.detach();
  });

  it("commits title on Enter and calls onSave", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();

    const display = el.querySelector(".title-edit-display") as HTMLElement;
    display.click(); // enter edit mode

    const input = el.querySelector(".title-edit-input") as HTMLInputElement;
    input.value = "New Title";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(callbacks.onSave).toHaveBeenCalledWith("New Title");
    ctrl.detach();
  });

  it("exits edit mode after commit", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();

    const display = el.querySelector(".title-edit-display") as HTMLElement;
    display.click();

    const input = el.querySelector(".title-edit-input") as HTMLInputElement;
    input.value = "New Title";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(input.classList.contains("hidden")).toBe(true);
    expect(display.classList.contains("hidden")).toBe(false);

    ctrl.detach();
  });

  it("cancels on Escape and calls onCancel", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();

    const display = el.querySelector(".title-edit-display") as HTMLElement;
    display.click();

    const input = el.querySelector(".title-edit-input") as HTMLInputElement;
    input.value = "Changed";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(callbacks.onCancel).toHaveBeenCalled();
    expect(input.classList.contains("hidden")).toBe(true);

    ctrl.detach();
  });

  it("commits on blur", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();

    const display = el.querySelector(".title-edit-display") as HTMLElement;
    display.click();

    const input = el.querySelector(".title-edit-input") as HTMLInputElement;
    input.value = "Blur Title";
    input.dispatchEvent(new FocusEvent("blur"));

    expect(callbacks.onSave).toHaveBeenCalledWith("Blur Title");

    ctrl.detach();
  });

  it("does not call onSave when title is unchanged", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();

    const display = el.querySelector(".title-edit-display") as HTMLElement;
    display.click();

    const input = el.querySelector(".title-edit-input") as HTMLInputElement;
    input.value = "Original Title";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    expect(callbacks.onSave).not.toHaveBeenCalled();

    ctrl.detach();
  });

  it("trims and resolves empty input to Untitled Session", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();

    const display = el.querySelector(".title-edit-display") as HTMLElement;
    display.click();

    const input = el.querySelector(".title-edit-input") as HTMLInputElement;
    input.value = "   ";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    // Empty trimmed title resolves to "Untitled Session" which differs from "Original Title"
    expect(callbacks.onSave).toHaveBeenCalledWith("Untitled Session");

    ctrl.detach();
  });

  it("detaches without errors even when called twice", () => {
    const ctrl = createTitleEditController(el, {
      initialTitle: "Original Title",
      ...callbacks,
    });
    ctrl.attach();
    ctrl.detach();
    ctrl.detach(); // should not throw
  });
});
