import type { DiffViewMode } from "../../../types/diff";

export function renderDiffViewModeToggle(currentMode: DiffViewMode): string {
  const unifiedActive = currentMode === "unified";
  const splitActive = currentMode === "split";

  function btn(mode: DiffViewMode, label: string, icon: string, active: boolean): string {
    return `<button type="button"
      class="diff-mode-btn px-2 py-1 text-xs font-mono rounded border transition-colors ${
        active
          ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-300"
          : "bg-neutral-900 border-neutral-700 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
      }"
      data-action="set-view-mode"
      data-mode="${mode}"
      title="${label} view"
    >
      <span class="diff-mode-icon mr-1">${icon}</span>
      <span class="diff-mode-label">${label}</span>
    </button>`;
  }

  return `<div class="diff-view-mode-toggle flex items-center gap-1" role="group" aria-label="Diff view mode">
    ${btn("unified", "Unified", "⊟", unifiedActive)}
    ${btn("split", "Split", "⊞", splitActive)}
  </div>`;
}
