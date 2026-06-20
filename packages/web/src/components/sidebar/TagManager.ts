export interface TagManagerOptions {
  tags: string[];
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  onTagClick?: (tag: string) => void;
}

export interface TagManagerController {
  attach(): void;
  detach(): void;
  focus(): void;
}

// ── Color palette ─────────────────────────────────────

const TAG_COLORS = [
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

function hashTagColor(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % TAG_COLORS.length;
}

// ── Escape helpers ────────────────────────────────────

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Render ────────────────────────────────────────────

export function renderTagManager(options: TagManagerOptions): string {
  const { tags } = options;

  const isEmpty = tags.length === 0;
  const emptyClass = isEmpty ? " tag-manager--empty" : "";

  const chipsHtml = tags
    .map((tag) => {
      const colorIndex = hashTagColor(tag);
      const color = TAG_COLORS[colorIndex];
      return `<span class="tag-chip tag-color-${colorIndex}" data-tag="${escapeAttr(tag)}" style="--tag-color:${color}" role="button" tabindex="0" aria-label="Remove tag ${escapeAttr(tag)}">
      <span class="tag-chip-text">${escapeHtml(tag)}</span>
      <button class="tag-chip-remove" data-action="remove-tag" type="button" aria-label="Remove tag ${escapeAttr(tag)}">&times;</button>
    </span>`;
    })
    .join("");

  const emptyHtml = isEmpty
    ? `<span class="tag-manager-empty-text">Add tags to organize sessions</span>`
    : "";

  return `<div class="tag-manager${emptyClass}">
    <div class="tag-manager-input-row">
      <input type="text" class="tag-manager-input" placeholder="Add tag..." aria-label="Add tag" />
    </div>
    <div class="tag-manager-chips">
      ${chipsHtml}
      ${emptyHtml}
    </div>
  </div>`;
}

// ── Controller ────────────────────────────────────────

export function createTagManagerController(
  el: HTMLElement,
  options: TagManagerOptions,
): TagManagerController {
  const { tags, onAddTag, onRemoveTag, onTagClick } = options;

  let inputEl: HTMLInputElement | null = null;

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const value = inputEl!.value.trim();
    if (!value) return;

    if (tags.includes(value)) return;

    onAddTag?.(value);
    inputEl!.value = "";
  }

  function onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    const removeBtn = target.closest<HTMLElement>('[data-action="remove-tag"]');
    if (removeBtn) {
      const chip = removeBtn.closest<HTMLElement>("[data-tag]");
      if (chip) {
        const tag = chip.getAttribute("data-tag")!;
        onRemoveTag?.(tag);
      }
      return;
    }

    const chip = target.closest<HTMLElement>("[data-tag]");
    if (chip) {
      const tag = chip.getAttribute("data-tag")!;
      onTagClick?.(tag);
    }
  }

  return {
    attach(): void {
      inputEl = el.querySelector<HTMLInputElement>(
        'input[type="text"]',
      );
      if (inputEl) {
        inputEl.addEventListener("keydown", onKeyDown);
      }
      el.addEventListener("click", onClick);
    },

    detach(): void {
      if (inputEl) {
        inputEl.removeEventListener("keydown", onKeyDown);
      }
      el.removeEventListener("click", onClick);
      inputEl = null;
    },

    focus(): void {
      if (inputEl) {
        inputEl.focus();
      }
    },
  };
}
