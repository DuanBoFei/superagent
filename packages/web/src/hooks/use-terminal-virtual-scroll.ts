import { createVirtualScroll } from "./use-virtual-scroll";
import type { VirtualScrollWindow, VirtualScrollItem } from "./use-virtual-scroll";

export interface TerminalVirtualScrollOptions {
  totalLines: number;
  fontSize?: number;
  lineHeight?: number;
  viewportHeight: number;
  scrollTop: number;
  threshold?: number;
  overscan?: number;
}

export interface TerminalVirtualScrollResult {
  enabled: boolean;
  window: VirtualScrollWindow;
  shouldAutoScroll: boolean;
}

const DEFAULT_THRESHOLD = 500;
const DEFAULT_FONT_SIZE = 13;
const DEFAULT_LINE_HEIGHT = 1.2;

// Terminal-specific virtual scroll with auto-enable threshold.
// Below `threshold` lines, all lines are rendered (no virtualization).
// At or above, only visible + overscan lines are rendered.
export function useTerminalVirtualScroll(
  options: TerminalVirtualScrollOptions,
): TerminalVirtualScrollResult {
  const {
    totalLines,
    fontSize = DEFAULT_FONT_SIZE,
    lineHeight = DEFAULT_LINE_HEIGHT,
    viewportHeight,
    scrollTop,
    threshold = DEFAULT_THRESHOLD,
    overscan = 3,
  } = options;

  const itemHeight = Math.round(fontSize * lineHeight);

  if (totalLines < threshold) {
    // Below threshold: render all lines, no virtualization
    return {
      enabled: false,
      window: {
        startIndex: 0,
        endIndex: totalLines,
        totalHeight: totalLines * itemHeight,
        topPadding: 0,
        bottomPadding: 0,
        items: Array.from({ length: totalLines }, (_, i) => ({
          index: i,
          offsetTop: i * itemHeight,
          height: itemHeight,
        })),
      },
      shouldAutoScroll: true,
    };
  }

  // Virtual scrolling enabled
  const window = createVirtualScroll({
    itemCount: totalLines,
    itemHeight,
    viewportHeight,
    scrollTop,
    overscan,
  });

  return {
    enabled: true,
    window,
    shouldAutoScroll: isNearBottom(scrollTop, viewportHeight, window.totalHeight),
  };
}

// Check if the user is near the bottom of the content.
// Used to decide whether to auto-scroll when new content arrives.
export function isNearBottom(
  scrollTop: number,
  viewportHeight: number,
  totalHeight: number,
  threshold: number = 50,
): boolean {
  const bottomEdge = scrollTop + viewportHeight;
  return bottomEdge >= totalHeight - threshold;
}

// Compute the visible line range from scroll state.
// Returns the indices of visible lines for rendering.
export function getVisibleLineRange(
  totalLines: number,
  scrollTop: number,
  viewportHeight: number,
  itemHeight: number,
  overscan: number = 3,
): { start: number; end: number } {
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(viewportHeight / itemHeight);
  return {
    start: Math.max(0, visibleStart - overscan),
    end: Math.min(totalLines, visibleStart + visibleCount + overscan),
  };
}
