export function renderDiffNavigationControls(
  currentHunkIndex: number,
  totalHunks: number,
): string {
  const isFirst = currentHunkIndex <= 0;
  const isLast = currentHunkIndex >= totalHunks - 1;
  const positionText = totalHunks > 0
    ? `${currentHunkIndex + 1} / ${totalHunks}`
    : "0 / 0";

  const prevDisabled = isFirst ? "opacity-30 cursor-not-allowed" : "hover:bg-neutral-700";
  const nextDisabled = isLast ? "opacity-30 cursor-not-allowed" : "hover:bg-neutral-700";

  return `<div class="diff-nav-controls flex items-center gap-1 text-xs font-mono" data-diff-navigation>
    <button type="button"
      class="diff-nav-prev px-2 py-1 rounded border border-neutral-700 bg-neutral-800 text-neutral-300 transition-colors ${prevDisabled}"
      data-action="prev-hunk"
      ${isFirst ? "disabled" : ""}
      aria-label="Previous change"
    >
      <svg class="w-3 h-3 inline" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 12L6 8l4-4"/>
      </svg>
    </button>
    <span class="diff-nav-position text-neutral-400 px-1 min-w-[3rem] text-center" aria-live="polite">${positionText}</span>
    <button type="button"
      class="diff-nav-next px-2 py-1 rounded border border-neutral-700 bg-neutral-800 text-neutral-300 transition-colors ${nextDisabled}"
      data-action="next-hunk"
      ${isLast ? "disabled" : ""}
      aria-label="Next change"
    >
      <svg class="w-3 h-3 inline" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 4l4 4-4 4"/>
      </svg>
    </button>
  </div>`;
}
