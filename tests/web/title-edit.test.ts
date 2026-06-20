import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  renderTitleEdit,
  createTitleEditController,
  buildDefaultTitle,
} from "../../packages/web/src/components/sidebar/TitleEdit";
import type {
  TitleEditController,
  TitleEditOptions,
} from "../../packages/web/src/components/sidebar/TitleEdit";

let jsdom: JSDOM;

function setupDOM(): HTMLElement {
  jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
  });

  globalThis.document = jsdom.window.document as unknown as Document;
  globalThis.window = jsdom.window as unknown as Window & typeof globalThis;
  globalThis.Event = jsdom.window.Event as unknown as typeof Event;
  globalThis.FocusEvent = jsdom.window.FocusEvent as unknown as typeof FocusEvent;
  globalThis.MouseEvent = jsdom.window.MouseEvent as unknown as typeof MouseEvent;
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
  delete (globalThis as Record<string, unknown>).FocusEvent;
  delete (globalThis as Record<string, unknown>).MouseEvent;
  delete (globalThis as Record<string, unknown>).KeyboardEvent;
}

// ── Pure function tests ─────────────────────────────────

describe("buildDefaultTitle", () => {
  it("returns Untitled Session when title is empty", () => {
    expect(buildDefaultTitle("")).toBe("Untitled Session");
  });

  it("returns Untitled Session when title is only whitespace", () => {
    expect(buildDefaultTitle("   ")).toBe("Untitled Session");
  });

  it("returns the original title when non-empty", () => {
    expect(buildDefaultTitle("Fix login bug")).toBe("Fix login bug");
  });
});

// ── Render tests ────────────────────────────────────────

describe("renderTitleEdit", () => {
  it("renders title in display span", () => {
    const html = renderTitleEdit("Fix login bug");
    expect(html).toContain("title-edit");
    expect(html).toContain("Fix login bug");
  });

  it("renders input element hidden by default", () => {
    const html = renderTitleEdit("Debug auth");
    expect(html).toContain('type="text"');
    expect(html).toContain("title-edit-input");
  });

  it("renders Untitled Session for empty title", () => {
    const html = renderTitleEdit("");
    expect(html).toContain("Untitled Session");
  });

  it("renders save status indicator hidden by default", () => {
    const html = renderTitleEdit("Test");
    expect(html).toContain("title-edit-status");
  });

  it("escapes HTML in title for display", () => {
    const html = renderTitleEdit('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ── Controller tests ────────────────────────────────────

describe("TitleEditController", () => {
  let container: HTMLElement;
  let controller: TitleEditController;

  afterEach(() => {
    controller?.detach();
    cleanupDOM();
  });

  function renderAndAttach(
    initialTitle: string,
    options: Partial<TitleEditOptions> = {},
  ): HTMLElement {
    container = setupDOM();
    container.innerHTML = renderTitleEdit(initialTitle);
    const el = container.querySelector<HTMLElement>(".title-edit")!;
    controller = createTitleEditController(el, {
      initialTitle,
      ...options,
    });
    controller.attach();
    return el;
  }

  it("switches to edit mode on title click", () => {
    renderAndAttach("Fix login bug");

    const display = container.querySelector<HTMLElement>(
      ".title-edit-display",
    )!;
    display.click();

    const input = container.querySelector<HTMLInputElement>(
      ".title-edit-input",
    )!;
    expect(input).toBeTruthy();
    // Input should be visible and have the current title value
    expect(input.value).toBe("Fix login bug");
  });

  it("saves on Enter key in edit mode", () => {
    const onSave = vi.fn();
    renderAndAttach("Fix login bug", { onSave });

    // Enter edit mode
    const display = container.querySelector<HTMLElement>(
      ".title-edit-display",
    )!;
    display.click();

    // Edit the title
    const input = container.querySelector<HTMLInputElement>(
      ".title-edit-input",
    )!;
    input.value = "New title";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Press Enter
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(onSave).toHaveBeenCalledWith("New title");
  });

  it("cancels on Escape key — reverts to original title", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    renderAndAttach("Original title", { onSave, onCancel });

    // Enter edit mode
    const display = container.querySelector<HTMLElement>(
      ".title-edit-display",
    )!;
    display.click();

    // Edit the title
    const input = container.querySelector<HTMLInputElement>(
      ".title-edit-input",
    )!;
    input.value = "Changed but cancelled";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Press Escape
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();

    // Display should show original title
    const displayAfter = container.querySelector<HTMLElement>(
      ".title-edit-display",
    )!;
    expect(displayAfter.textContent).toBe("Original title");
  });

  it("auto-saves on blur", () => {
    const onSave = vi.fn();
    renderAndAttach("Fix login bug", { onSave });

    // Enter edit mode
    const display = container.querySelector<HTMLElement>(
      ".title-edit-display",
    )!;
    display.click();

    // Edit the title
    const input = container.querySelector<HTMLInputElement>(
      ".title-edit-input",
    )!;
    input.value = "Blur saved title";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Blur the input
    input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

    expect(onSave).toHaveBeenCalledWith("Blur saved title");
  });

  it("saves empty title as Untitled Session", () => {
    const onSave = vi.fn();
    renderAndAttach("Some title", { onSave });

    // Enter edit mode
    const display = container.querySelector<HTMLElement>(
      ".title-edit-display",
    )!;
    display.click();

    // Clear the title
    const input = container.querySelector<HTMLInputElement>(
      ".title-edit-input",
    )!;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Press Enter
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(onSave).toHaveBeenCalledWith("Untitled Session");
  });

  it("saves whitespace-only title as Untitled Session", () => {
    const onSave = vi.fn();
    renderAndAttach("Some title", { onSave });

    const display = container.querySelector<HTMLElement>(
      ".title-edit-display",
    )!;
    display.click();

    const input = container.querySelector<HTMLInputElement>(
      ".title-edit-input",
    )!;
    input.value = "   ";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(onSave).toHaveBeenCalledWith("Untitled Session");
  });

  it("does not save if title unchanged", () => {
    const onSave = vi.fn();
    renderAndAttach("Same title", { onSave });

    const display = container.querySelector<HTMLElement>(
      ".title-edit-display",
    )!;
    display.click();

    const input = container.querySelector<HTMLInputElement>(
      ".title-edit-input",
    )!;
    // Don't change the value, just blur
    input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("trims whitespace from saved title", () => {
    const onSave = vi.fn();
    renderAndAttach("Original", { onSave });

    const display = container.querySelector<HTMLElement>(
      ".title-edit-display",
    )!;
    display.click();

    const input = container.querySelector<HTMLInputElement>(
      ".title-edit-input",
    )!;
    input.value = "  Trimmed title  ";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(onSave).toHaveBeenCalledWith("Trimmed title");
  });

  it("detach removes event listeners", () => {
    const onSave = vi.fn();
    renderAndAttach("Title", { onSave });

    const display = container.querySelector<HTMLElement>(
      ".title-edit-display",
    )!;
    display.click();

    controller.detach();

    const input = container.querySelector<HTMLInputElement>(
      ".title-edit-input",
    )!;
    input.value = "Should not save";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(onSave).not.toHaveBeenCalled();
  });
});
