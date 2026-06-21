interface DiffNavigationControlsProps {
  currentHunkIndex: number;
  totalHunks: number;
  onPrev: () => void;
  onNext: () => void;
}

export function DiffNavigationControls({ currentHunkIndex, totalHunks, onPrev, onNext }: DiffNavigationControlsProps) {
  const isFirst = currentHunkIndex <= 0;
  const isLast = currentHunkIndex >= totalHunks - 1;
  const positionText = totalHunks > 0 ? `${currentHunkIndex + 1} / ${totalHunks}` : "0 / 0";

  return (
    <div className="flex items-center gap-1 text-xs font-mono" data-diff-navigation>
      <button
        type="button"
        className={`px-2 py-1 rounded border border-neutral-700 bg-neutral-800 text-neutral-300 transition-colors ${isFirst ? "opacity-30 cursor-not-allowed" : "hover:bg-neutral-700"}`}
        onClick={onPrev}
        disabled={isFirst}
        aria-label="Previous change"
      >
        <svg className="w-3 h-3 inline" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 12L6 8l4-4" />
        </svg>
      </button>
      <span className="text-neutral-400 px-1 min-w-[3rem] text-center" aria-live="polite">{positionText}</span>
      <button
        type="button"
        className={`px-2 py-1 rounded border border-neutral-700 bg-neutral-800 text-neutral-300 transition-colors ${isLast ? "opacity-30 cursor-not-allowed" : "hover:bg-neutral-700"}`}
        onClick={onNext}
        disabled={isLast}
        aria-label="Next change"
      >
        <svg className="w-3 h-3 inline" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 4l4 4-4 4" />
        </svg>
      </button>
    </div>
  );
}
