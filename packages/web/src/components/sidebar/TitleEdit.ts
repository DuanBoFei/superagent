// ── Types ───────────────────────────────────────────────

export interface TitleEditOptions {
  initialTitle: string;
  onSave?: (title: string) => void;
  onCancel?: () => void;
}

export interface TitleEditController {
  attach(): void;
  detach(): void;
}

// ── Pure functions ──────────────────────────────────────

export function buildDefaultTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.length === 0 ? "Untitled Session" : trimmed;
}

// ── Render ──────────────────────────────────────────────

export function renderTitleEdit(title: string): string {
  const displayTitle = buildDefaultTitle(title);

  return `<span class="title-edit inline-flex items-center gap-1 group">
    <span class="title-edit-display text-[14px] font-medium text-neutral-200 cursor-pointer hover:text-neutral-100 transition-colors border-b border-dotted border-transparent hover:border-emerald-500/50" data-action="title-edit-start" title="Click to edit title">${escapeHtml(displayTitle)}</span>
    <input type="text" class="title-edit-input hidden w-full bg-neutral-950 border border-emerald-500/50 rounded px-1.5 py-0.5 text-[14px] font-medium text-neutral-200 font-mono focus:border-emerald-500 focus:outline-none" value="${escapeHtml(displayTitle)}" data-action="title-edit-input" />
    <span class="title-edit-status hidden text-[11px] text-neutral-500 tabular-nums" data-action="title-edit-status"></span>
  </span>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Controller ──────────────────────────────────────────

export function createTitleEditController(
  el: HTMLElement,
  options: TitleEditOptions,
): TitleEditController {
  const { initialTitle, onSave, onCancel } = options;
  let originalTitle = initialTitle;
  let currentTitle = initialTitle;
  let isEditing = false;

  const display = el.querySelector<HTMLElement>(".title-edit-display")!;
  const input = el.querySelector<HTMLInputElement>(".title-edit-input")!;

  function enterEditMode(): void {
    if (isEditing) return;
    isEditing = true;
    input.value = buildDefaultTitle(originalTitle);
    display.classList.add("hidden");
    input.classList.remove("hidden");
    input.focus();
    input.select();
  }

  function exitEditMode(): void {
    if (!isEditing) return;
    isEditing = false;
    input.classList.add("hidden");
    display.classList.remove("hidden");
  }

  function commitTitle(newTitle: string): void {
    const resolved = buildDefaultTitle(newTitle.trim());
    if (resolved === buildDefaultTitle(originalTitle)) {
      exitEditMode();
      return;
    }
    originalTitle = resolved;
    currentTitle = resolved;
    display.textContent = resolved;
    onSave?.(resolved);
    exitEditMode();
  }

  function revertTitle(): void {
    onCancel?.();
    exitEditMode();
  }

  function onDisplayClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const startEdit = target.closest<HTMLElement>(
      '[data-action="title-edit-start"]',
    );
    if (startEdit) {
      enterEditMode();
    }
  }

  function onInputKeyDown(e: KeyboardEvent): void {
    if (!isEditing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      commitTitle(input.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      revertTitle();
    }
  }

  function onInputBlur(): void {
    if (!isEditing) return;
    commitTitle(input.value);
  }

  function onDisplayKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    const startEdit = target.closest<HTMLElement>(
      '[data-action="title-edit-start"]',
    );
    if (startEdit && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      enterEditMode();
    }
  }

  return {
    attach(): void {
      display.addEventListener("click", onDisplayClick);
      display.addEventListener("keydown", onDisplayKeyDown);
      input.addEventListener("keydown", onInputKeyDown);
      input.addEventListener("blur", onInputBlur);
    },

    detach(): void {
      display.removeEventListener("click", onDisplayClick);
      display.removeEventListener("keydown", onDisplayKeyDown);
      input.removeEventListener("keydown", onInputKeyDown);
      input.removeEventListener("blur", onInputBlur);
    },
  };
}
