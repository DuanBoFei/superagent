import type { DiffViewerProps, DiffHunk, DiffViewMode } from "../../../types/diff";
import { parseUnifiedDiff, computeDiffHunks, markContextHunks } from "../../../lib/diff-parser";
import { calculateStatistics } from "../../../lib/diff-statistics";
import { applyCharLevelDiff } from "../../../hooks/use-char-level-diff";
import { createDiffSlice } from "../../../store/slices/diff.slice";
import { renderDiffUnifiedView } from "./DiffUnifiedView";
import { renderDiffSplitView } from "./DiffSplitView";
import { renderDiffStatistics } from "./DiffStatistics";
import { renderDiffViewModeToggle } from "./DiffViewModeToggle";
import { renderDiffNavigationControls } from "./DiffNavigationControls";
import { renderDiffGutterIndicators } from "./DiffGutterIndicators";
import { renderExpandAllButton } from "../../../hooks/use-diff-virtual-scroll";

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

export function renderDiffViewer(
  props: DiffViewerProps,
  storage?: { getItem(key: string): string | null; setItem(key: string, value: string): void },
): { html: string; getState: () => DiffViewerState; getSlice: () => ReturnType<typeof createDiffSlice> } {
  const slice = createDiffSlice(
    storage ?? createMemoryStorage(),
    props.defaultViewMode ?? "unified",
  );

  if (props.showStatistics !== false) {
    // default true
  }
  if (props.showNavigation !== false) {
    // default true
  }

  let hunks = parseInput(props);

  // Apply char-level diff if not disabled
  hunks = applyCharLevelDiff(hunks);

  const state = slice.getState();
  const stats = calculateStatistics(hunks);

  const contextHunkCount = hunks.filter((h) => h.isContextHunk).length;

  const headerParts: string[] = [];

  if (props.showStatistics !== false) {
    headerParts.push(renderDiffStatistics(stats));
  }

  headerParts.push(
    `<div class="diff-viewer-toolbar flex items-center gap-2 px-3 py-2 bg-neutral-900 border-b border-neutral-800">
      ${renderDiffViewModeToggle(state.viewMode)}
      <div class="flex-1"></div>
      ${props.showNavigation !== false ? renderDiffNavigationControls(state.currentHunkIndex, stats.changeBlocks) : ""}
      ${renderExpandAllButton(contextHunkCount)}
    </div>`,
  );

  const viewHtml =
    state.viewMode === "split"
      ? renderDiffSplitView(hunks, state.collapsedHunks, {
          language: props.language,
          showCharHighlighting: true,
        })
      : renderDiffUnifiedView(hunks, state.collapsedHunks, {
          language: props.language,
          showCharHighlighting: true,
          collapsibleHunks: true,
        });

  const gutterHtml = renderDiffGutterIndicators(hunks, stats.totalLines);

  const html = `<div class="diff-viewer rounded border border-neutral-800 bg-neutral-950 overflow-hidden" data-diff-viewer>
    ${headerParts.join("\n")}
    <div class="diff-viewer-content relative overflow-auto" style="max-height:${props.viewportHeight ?? "600"}px">
      ${viewHtml}
      ${gutterHtml}
    </div>
  </div>`;

  return {
    html,
    getState: () => ({
      hunks,
      viewMode: state.viewMode,
      collapsedHunks: state.collapsedHunks,
      currentHunkIndex: state.currentHunkIndex,
      showStatistics: props.showStatistics !== false,
      showNavigation: props.showNavigation !== false,
    }),
    getSlice: () => slice,
  };
}

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}
