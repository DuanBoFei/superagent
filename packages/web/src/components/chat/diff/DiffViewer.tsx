import { useState, useMemo, useCallback, useEffect } from "react";
import type { DiffViewerProps, DiffHunk, DiffViewMode } from "../../../types/diff";
import { parseUnifiedDiff, computeDiffHunks, markContextHunks } from "../../../lib/diff-parser";
import { calculateStatistics } from "../../../lib/diff-statistics";
import { applyCharLevelDiff } from "../../../hooks/use-char-level-diff";
import { DiffUnifiedView } from "./DiffUnifiedView";
import { DiffSplitView } from "./DiffSplitView";
import { DiffStatistics } from "./DiffStatistics";
import { DiffViewModeToggle } from "./DiffViewModeToggle";
import { DiffNavigationControls } from "./DiffNavigationControls";
import { DiffGutterIndicators } from "./DiffGutterIndicators";

export interface DiffViewerState {
  hunks: DiffHunk[];
  viewMode: DiffViewMode;
  collapsedHunks: Set<number>;
  currentHunkIndex: number;
  showStatistics: boolean;
  showNavigation: boolean;
}

function parseInput(props: DiffViewerProps): DiffHunk[] {
  if (props.diff) {
    let hunks = parseUnifiedDiff(props.diff);
    hunks = markContextHunks(hunks);
    return hunks;
  }

  if (props.oldContent !== undefined && props.newContent !== undefined) {
    let hunks = computeDiffHunks(props.oldContent, props.newContent);
    hunks = markContextHunks(hunks);
    return hunks;
  }

  return [];
}

export function useDiffViewer(props: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>(props.defaultViewMode ?? "unified");
  const [collapsedHunks, setCollapsedHunks] = useState<Set<number>>(new Set());
  const [currentHunkIndex, setCurrentHunkIndex] = useState(0);

  const hunks = useMemo(() => {
    const raw = parseInput(props);
    return applyCharLevelDiff(raw);
  }, [props.diff, props.oldContent, props.newContent]);

  const stats = useMemo(() => calculateStatistics(hunks), [hunks]);

  const contextHunkCount = hunks.filter((h) => h.isContextHunk).length;
  const totalHunks = stats.changeBlocks;

  // Reset state when hunks change
  useEffect(() => {
    setCollapsedHunks(new Set());
    setCurrentHunkIndex(0);
  }, [hunks]);

  const toggleHunk = useCallback((hunkIndex: number) => {
    setCollapsedHunks((prev) => {
      const next = new Set(prev);
      if (next.has(hunkIndex)) {
        next.delete(hunkIndex);
      } else {
        next.add(hunkIndex);
      }
      return next;
    });
  }, []);

  const expandAllContext = useCallback(() => {
    setCollapsedHunks(new Set());
  }, []);

  const navigateNext = useCallback(() => {
    setCurrentHunkIndex((prev) => {
      const next = prev + 1;
      return next >= totalHunks ? prev : next;
    });
  }, [totalHunks]);

  const navigatePrev = useCallback(() => {
    setCurrentHunkIndex((prev) => {
      const next = prev - 1;
      return next < 0 ? prev : next;
    });
  }, []);

  const scrollToHunk = useCallback((hunkIndex: number) => {
    setCurrentHunkIndex(Math.max(0, hunkIndex));
  }, []);

  return {
    hunks,
    viewMode,
    collapsedHunks,
    currentHunkIndex,
    stats,
    contextHunkCount,
    totalHunks,
    setViewMode,
    toggleHunk,
    expandAllContext,
    navigateNext,
    navigatePrev,
    scrollToHunk,
  };
}

interface DiffViewerComponentProps extends DiffViewerProps {
  className?: string;
}

export function DiffViewer(props: DiffViewerComponentProps) {
  const {
    hunks,
    viewMode,
    collapsedHunks,
    currentHunkIndex,
    stats,
    contextHunkCount,
    totalHunks,
    setViewMode,
    toggleHunk,
    expandAllContext,
    navigateNext,
    navigatePrev,
    scrollToHunk,
  } = useDiffViewer(props);

  const showStats = props.showStatistics !== false;
  const showNav = props.showNavigation !== false;

  return (
    <div className={`diff-viewer rounded border border-neutral-800 bg-neutral-950 overflow-hidden ${props.className ?? ""}`} data-diff-viewer>
      {showStats && <DiffStatistics stats={stats} />}

      <div className="diff-viewer-toolbar flex items-center gap-2 px-3 py-2 bg-neutral-900 border-b border-neutral-800">
        <DiffViewModeToggle currentMode={viewMode} onSetMode={setViewMode} />
        <div className="flex-1" />
        {showNav && (
          <DiffNavigationControls
            currentHunkIndex={currentHunkIndex}
            totalHunks={totalHunks}
            onPrev={navigatePrev}
            onNext={navigateNext}
          />
        )}
        {contextHunkCount > 0 && (
          <button
            type="button"
            className="px-3 py-1 text-xs font-mono rounded border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
            onClick={expandAllContext}
          >
            Expand all {contextHunkCount} hidden context {contextHunkCount === 1 ? "section" : "sections"}
          </button>
        )}
      </div>

      <div className="diff-viewer-content relative overflow-auto" style={{ maxHeight: props.viewportHeight ?? 600 }}>
        {viewMode === "split" ? (
          <DiffSplitView
            hunks={hunks}
            collapsedHunks={collapsedHunks}
            language={props.language}
            showCharHighlighting
            onToggleHunk={toggleHunk}
          />
        ) : (
          <DiffUnifiedView
            hunks={hunks}
            collapsedHunks={collapsedHunks}
            language={props.language}
            showCharHighlighting
            collapsibleHunks
            onToggleHunk={toggleHunk}
          />
        )}
        <DiffGutterIndicators hunks={hunks} totalLines={stats.totalLines} onScrollToHunk={scrollToHunk} />
      </div>
    </div>
  );
}
